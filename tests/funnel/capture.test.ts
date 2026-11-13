import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureInput, lead, bookedLead } from "../leads/fixtures";

vi.mock("@/lib/leads/repo", () => ({
  createLead: vi.fn(),
  findOpenByEmail: vi.fn(),
  bookedSlots: vi.fn(),
  countRecentByIp: vi.fn(),
  recordEmailError: vi.fn(),
  saveFollowupIds: vi.fn(),
  getLead: vi.fn(),
}));
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn(), cancelEmail: vi.fn() }));

import * as repo from "@/lib/leads/repo";
import { cancelEmail, sendEmail } from "@/lib/email/send";
import { captureLead, scheduleFollowUps, FOLLOWUP_DAYS } from "@/lib/funnel/capture";
import { readLeadToken } from "@/lib/funnel/token";

const r = vi.mocked(repo);
const send = vi.mocked(sendEmail);
const cancel = vi.mocked(cancelEmail);
const NOW = new Date("2027-03-10T00:00:00Z");
const ctx = { ip: "1.2.3.4", now: NOW };
const DAY = 86_400_000;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OWNER_EMAIL = "owner@example.com";
  process.env.SESSION_SECRET = "test-secret";
  process.env.NEXT_PUBLIC_SITE_URL = "https://pispark.site";
  r.createLead.mockImplementation(async (input) =>
    lead({ contactName: input.firstName, email: input.email, role: input.role, parentEmail: input.parentEmail }),
  );
  r.findOpenByEmail.mockResolvedValue(null);
  r.bookedSlots.mockResolvedValue([]);
  r.countRecentByIp.mockResolvedValue(0);
  r.recordEmailError.mockResolvedValue();
  r.saveFollowupIds.mockResolvedValue();
  r.getLead.mockResolvedValue(lead());
  send.mockResolvedValue({ id: "email_1" });
  cancel.mockResolvedValue();
});

const sentTo = (to: string) => send.mock.calls.map((c) => c[0]).filter((a) => a.to === to);

describe("captureLead", () => {
  it("saves the lead from a name and an email and hands back a link token for it", async () => {
    const res = await captureLead(captureInput(), ctx);
    expect(res).toMatchObject({ ok: true, existing: false, booked: false });
    expect(r.createLead).toHaveBeenCalledTimes(1);
    if (res.ok) expect(readLeadToken(res.token, "test-secret")).toBe(lead().id);
  });

  it("replies at once with one-tap times and a link to all times", async () => {
    await captureLead(captureInput(), ctx);
    const [reply] = sentTo("dana@example.com");
    expect(reply.scheduledAt).toBeUndefined();
    const links = reply.text.match(/https:\/\/pispark\.site\/pick\?l=[^\s]+/g) ?? [];
    expect(links.filter((l) => l.includes("&slot=")).length).toBe(3);
    expect(links.some((l) => !l.includes("&slot="))).toBe(true);
    expect(reply.text).toContain("Dana");
  });

  it("still replies when no times are available", async () => {
    r.bookedSlots.mockRejectedValue(new Error("db hiccup"));
    const res = await captureLead(captureInput(), ctx);
    expect(res.ok).toBe(true);
    expect(sentTo("dana@example.com")).toHaveLength(1);
  });

  it("alerts the owner", async () => {
    await captureLead(captureInput(), ctx);
    const [alert] = sentTo("owner@example.com");
    expect(alert.text).toContain("dana@example.com");
    expect(alert.text).toContain("instagram");
  });

  it("copies the parent when a student signs up", async () => {
    await captureLead(captureInput({ role: "student", parentEmail: "mom@example.com" }), ctx);
    expect(sentTo("dana@example.com")[0].cc).toBe("mom@example.com");
  });

  it("keeps the lead and records the problem when email fails", async () => {
    send.mockRejectedValue(new Error("email service down"));
    const res = await captureLead(captureInput(), ctx);
    expect(res.ok).toBe(true);
    expect(r.recordEmailError).toHaveBeenCalledWith(lead().id, expect.stringContaining("email service down"));
  });

  it("returns the same lead, without new emails, when the family signs up twice", async () => {
    r.findOpenByEmail.mockResolvedValue(lead());
    const res = await captureLead(captureInput(), ctx);
    expect(res).toMatchObject({ ok: true, existing: true, booked: false });
    expect(res.ok && res.created).toBeUndefined();
    expect(r.createLead).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(r.findOpenByEmail).toHaveBeenCalledWith("dana@example.com", new Date(NOW.getTime() - 30 * DAY));
  });

  it("says so when the returning family already has a time booked", async () => {
    r.findOpenByEmail.mockResolvedValue(bookedLead());
    expect(await captureLead(captureInput(), ctx)).toMatchObject({ ok: true, existing: true, booked: true });
  });

  it("drops a bot that fills the hidden field, logging it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await captureLead({ ...captureInput(), website: "spam" }, ctx);
    expect(res).toMatchObject({ ok: true, token: "" });
    expect(r.createLead).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("names the failing field for invalid input", async () => {
    const res = await captureLead({ ...captureInput(), email: "nope" }, ctx);
    expect(res).toMatchObject({ ok: false, status: 400 });
    if (!res.ok && res.status === 400) expect(res.issues.map((i) => i.path)).toContain("email");
  });

  it("limits one address to five sign-ups an hour", async () => {
    r.countRecentByIp.mockResolvedValue(5);
    expect(await captureLead(captureInput(), ctx)).toEqual({ ok: false, status: 429 });
    expect(r.createLead).not.toHaveBeenCalled();
  });
});

describe("scheduleFollowUps", () => {
  it("schedules one nudge per follow-up day and remembers them for cancelling", async () => {
    send.mockImplementation(async (a) => ({ id: `f_${a.scheduledAt!.toISOString().slice(0, 10)}` }));
    await scheduleFollowUps(lead(), NOW);
    const days = send.mock.calls.map((c) => Math.round((c[0].scheduledAt!.getTime() - NOW.getTime()) / DAY));
    expect(days).toEqual([...FOLLOWUP_DAYS]);
    expect(FOLLOWUP_DAYS).toEqual([1, 3, 6, 10, 14]);
    expect(r.saveFollowupIds).toHaveBeenCalledWith(lead().id, [
      "f_2027-03-11", "f_2027-03-13", "f_2027-03-16", "f_2027-03-20", "f_2027-03-24",
    ]);
  });

  it("puts an unsubscribe link and the postal address in every nudge", async () => {
    await scheduleFollowUps(lead(), NOW);
    for (const [mail] of send.mock.calls) {
      expect(mail.text).toMatch(/https:\/\/pispark\.site\/unsubscribe\?l=/);
      expect(mail.text).toContain("Syganak 4, Astana 010000, Kazakhstan");
    }
  });

  it("does nothing if the lead booked or unsubscribed in the meantime", async () => {
    r.getLead.mockResolvedValue(bookedLead());
    await scheduleFollowUps(lead(), NOW);
    expect(send).not.toHaveBeenCalled();
  });

  it("withdraws the nudges if the family booked while they were being scheduled", async () => {
    let n = 0;
    send.mockImplementation(async () => ({ id: `f${++n}` }));
    r.getLead.mockResolvedValueOnce(lead()).mockResolvedValueOnce(bookedLead());
    await scheduleFollowUps(lead(), NOW);
    expect(cancel.mock.calls.map((c) => c[0])).toEqual(["f1", "f2", "f3", "f4", "f5"]);
    expect(r.saveFollowupIds).not.toHaveBeenCalled();
  });

  it("stores the nudges it managed to schedule when one fails", async () => {
    let n = 0;
    send.mockImplementation(async () => {
      if (++n === 2) throw new Error("rate limited");
      return { id: `f${n}` };
    });
    await scheduleFollowUps(lead(), NOW);
    expect(r.saveFollowupIds).toHaveBeenCalledWith(lead().id, ["f1", "f3", "f4", "f5"]);
  });
});
