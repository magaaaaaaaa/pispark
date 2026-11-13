import { beforeEach, describe, expect, it, vi } from "vitest";
import { lead, validInput } from "../leads/fixtures";

vi.mock("@/lib/leads/repo", () => {
  class SlotTakenError extends Error {}
  return {
    SlotTakenError,
    createLead: vi.fn(),
    findUpcomingByEmail: vi.fn(),
    bookedSlots: vi.fn(),
    countRecentByIp: vi.fn(),
    recordEmailError: vi.fn(),
    saveReminderIds: vi.fn(),
  };
});
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn() }));

import * as repo from "@/lib/leads/repo";
import { sendEmail } from "@/lib/email/send";
import { bookTrial, reminderTimes } from "@/lib/booking/book";

const r = vi.mocked(repo);
const send = vi.mocked(sendEmail);

// Wednesday 2027-03-10 05:00 owner time; the fixture slot (16 March 00:00Z) is 6 days away.
const NOW = new Date("2027-03-10T00:00:00Z");
const SLOT = "2027-03-16T00:00:00.000Z";
const ctx = { ip: "1.2.3.4", now: NOW };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OWNER_EMAIL = "owner@example.com";
  process.env.TRIAL_CALL_URL = "https://meet.example.com/pispark";
  process.env.NEXT_PUBLIC_SITE_URL = "https://pispark.site";
  r.createLead.mockImplementation(async (input) =>
    lead({ ...input, stage: input.slot ? "trial_booked" : "new" }),
  );
  r.findUpcomingByEmail.mockResolvedValue(null);
  r.bookedSlots.mockResolvedValue([]);
  r.countRecentByIp.mockResolvedValue(0);
  r.recordEmailError.mockResolvedValue();
  r.saveReminderIds.mockResolvedValue();
  send.mockResolvedValue({ id: "email_1" });
});

const sentTo = (to: string) => send.mock.calls.map((c) => c[0]).filter((a) => a.to === to);

describe("bookTrial", () => {
  it("saves the lead and confirms to the family with a calendar file", async () => {
    const res = await bookTrial(validInput(), ctx);
    expect(res).toEqual({ ok: true, leadId: lead().id, existing: false });
    expect(r.createLead).toHaveBeenCalledTimes(1);
    const now = sentTo("dana@example.com").filter((a) => !a.scheduledAt);
    expect(now).toHaveLength(1);
    expect(now[0].ics).toContain("DTSTART:20270316T000000Z");
    expect(now[0].cc).toBeUndefined();
  });

  it("notifies the owner", async () => {
    await bookTrial(validInput(), ctx);
    expect(sentTo("owner@example.com")).toHaveLength(1);
  });

  it("schedules reminders 24 hours and 1 hour before the trial", async () => {
    await bookTrial(validInput(), ctx);
    const times = sentTo("dana@example.com")
      .filter((a) => a.scheduledAt)
      .map((a) => a.scheduledAt!.toISOString());
    expect(times.sort()).toEqual(["2027-03-15T00:00:00.000Z", "2027-03-15T23:00:00.000Z"]);
  });

  it("copies the parent on everything when a student books", async () => {
    await bookTrial(validInput({ role: "student", parentEmail: "parent@example.com" }), ctx);
    const family = sentTo("dana@example.com");
    expect(family).toHaveLength(3);
    for (const a of family) expect(a.cc).toBe("parent@example.com");
  });

  it("sends no reminders or calendar file when no slot was chosen", async () => {
    const res = await bookTrial(validInput({ slot: null }), ctx);
    expect(res.ok).toBe(true);
    const family = sentTo("dana@example.com");
    expect(family).toHaveLength(1);
    expect(family[0].ics).toBeUndefined();
    expect(family[0].scheduledAt).toBeUndefined();
  });

  it("pretends to succeed for a bot that fills the hidden field, and stores nothing", async () => {
    const res = await bookTrial({ ...validInput(), website: "http://spam" }, ctx);
    expect(res.ok).toBe(true);
    expect(r.createLead).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("logs a dropped honeypot submission so a real family caught by it can be found", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await bookTrial({ ...validInput(), website: "filled by autofill" }, ctx);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("honeypot"), expect.objectContaining({ email: "dana@example.com" }));
    warn.mockRestore();
  });

  it("sends emails one at a time, the family's confirmation first", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    send.mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((res) => setTimeout(res, 1));
      inFlight--;
      return { id: "x" };
    });
    await bookTrial(validInput(), ctx);
    expect(maxInFlight).toBe(1);
    expect(send.mock.calls[0][0]).toMatchObject({ to: "dana@example.com" });
    expect(send.mock.calls[0][0].scheduledAt).toBeUndefined();
  });

  it("gives the owner a calendar file too", async () => {
    await bookTrial(validInput(), ctx);
    expect(sentTo("owner@example.com")[0].ics).toContain("DTSTART:20270316T000000Z");
  });

  it("remembers the scheduled reminders so they can be cancelled later", async () => {
    send.mockImplementation(async (a) => ({ id: a.scheduledAt ? `rem_${a.scheduledAt.toISOString()}` : "now" }));
    await bookTrial(validInput(), ctx);
    expect(r.saveReminderIds).toHaveBeenCalledWith(lead().id, [
      "rem_2027-03-15T00:00:00.000Z",
      "rem_2027-03-15T23:00:00.000Z",
    ]);
  });

  it("rejects invalid input with the failing field named", async () => {
    const res = await bookTrial({ ...validInput(), email: "nope" }, ctx);
    expect(res).toMatchObject({ ok: false, status: 400 });
    if (!res.ok && res.status === 400) expect(res.issues.map((i) => i.path)).toContain("email");
    expect(r.createLead).not.toHaveBeenCalled();
  });

  it.each([
    ["in the past", "2027-03-09T00:00:00.000Z"],
    ["off the half-hour grid", "2027-03-16T00:10:00.000Z"],
    ["outside the owner's windows", "2027-03-16T08:00:00.000Z"],
    ["not a date", "soon"],
  ])("rejects a slot that is %s", async (_label, slot) => {
    const res = await bookTrial(validInput({ slot }), ctx);
    expect(res).toMatchObject({ ok: false, status: 400 });
    expect(r.createLead).not.toHaveBeenCalled();
  });

  it("tells the family when the slot was just taken and offers the remaining ones", async () => {
    r.createLead.mockRejectedValue(new repo.SlotTakenError());
    r.bookedSlots.mockResolvedValue([SLOT]);
    const res = await bookTrial(validInput(), ctx);
    expect(res).toMatchObject({ ok: false, status: 409, reason: "slot_taken" });
    if (!res.ok && res.status === 409) {
      expect(res.slots).not.toContain(SLOT);
      expect(res.slots).toContain("2027-03-16T00:30:00.000Z");
    }
    expect(send).not.toHaveBeenCalled();
  });

  it("keeps the booking and records the problem when email fails", async () => {
    send.mockRejectedValue(new Error("email service down"));
    const res = await bookTrial(validInput(), ctx);
    expect(res).toMatchObject({ ok: true, existing: false });
    expect(r.recordEmailError).toHaveBeenCalledWith(lead().id, expect.stringContaining("email service down"));
  });

  it("still notifies the owner when the family's confirmation fails", async () => {
    send.mockImplementation(async (a) => {
      if (a.to === "dana@example.com") throw new Error("bounced");
      return { id: "x" };
    });
    await bookTrial(validInput(), ctx);
    expect(sentTo("owner@example.com")).toHaveLength(1);
  });

  it("returns the existing booking instead of creating a second one", async () => {
    r.findUpcomingByEmail.mockResolvedValue(lead({ id: "99999999-2222-3333-4444-555555555555" }));
    const res = await bookTrial(validInput(), ctx);
    expect(res).toEqual({ ok: true, leadId: "99999999-2222-3333-4444-555555555555", existing: true });
    expect(r.createLead).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("looks up an existing booking by the normalised email", async () => {
    await bookTrial(validInput({ email: " Dana@Example.com " }), ctx);
    expect(r.findUpcomingByEmail).toHaveBeenCalledWith("dana@example.com", NOW);
  });

  it("limits one address to five bookings an hour", async () => {
    r.countRecentByIp.mockResolvedValue(5);
    const res = await bookTrial(validInput(), ctx);
    expect(res).toEqual({ ok: false, status: 429 });
    expect(r.createLead).not.toHaveBeenCalled();
    expect(r.countRecentByIp).toHaveBeenCalledWith("1.2.3.4", new Date("2027-03-09T23:00:00Z"));
  });

  it("skips the rate limit when the address is unknown", async () => {
    const res = await bookTrial(validInput(), { ip: null, now: NOW });
    expect(res.ok).toBe(true);
    expect(r.countRecentByIp).not.toHaveBeenCalled();
  });
});

describe("reminderTimes", () => {
  it("gives both reminders for a trial days away", () => {
    expect(reminderTimes(SLOT, NOW).map((x) => x.kind)).toEqual(["day", "hour"]);
  });
  it("gives only the 1-hour reminder for a trial less than a day away", () => {
    expect(reminderTimes(SLOT, new Date("2027-03-15T06:00:00Z")).map((x) => x.kind)).toEqual(["hour"]);
  });
  it("gives none for a trial less than an hour away", () => {
    expect(reminderTimes(SLOT, new Date("2027-03-15T23:30:00Z"))).toEqual([]);
  });
});
