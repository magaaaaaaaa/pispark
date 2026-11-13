import { beforeEach, describe, expect, it, vi } from "vitest";
import { lead, bookedLead } from "../leads/fixtures";

vi.mock("@/lib/leads/repo", () => {
  class SlotTakenError extends Error {}
  return {
    SlotTakenError,
    getLead: vi.fn(),
    setTrial: vi.fn(),
    bookedSlots: vi.fn(),
    recordEmailError: vi.fn(),
    saveReminderIds: vi.fn(),
    saveFollowupIds: vi.fn(),
    saveDetails: vi.fn(),
    markUnsubscribed: vi.fn(),
  };
});
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn(), cancelEmail: vi.fn() }));

import * as repo from "@/lib/leads/repo";
import { cancelEmail, sendEmail } from "@/lib/email/send";
import { pickSlot, reminderTimes, saveLeadDetails, unsubscribeLead } from "@/lib/funnel/pick";
import { leadToken } from "@/lib/funnel/token";

const r = vi.mocked(repo);
const send = vi.mocked(sendEmail);
const cancel = vi.mocked(cancelEmail);
const NOW = new Date("2027-03-10T00:00:00Z");
const SLOT = "2027-03-16T00:00:00.000Z";
const OTHER = "2027-03-17T00:00:00.000Z";
const TOKEN = leadToken(lead().id, "test-secret");

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OWNER_EMAIL = "owner@example.com";
  process.env.SESSION_SECRET = "test-secret";
  process.env.TRIAL_CALL_URL = "https://meet.example.com/pispark";
  process.env.NEXT_PUBLIC_SITE_URL = "https://pispark.site";
  r.getLead.mockResolvedValue(lead({ followupIds: ["f1", "f2"] }));
  r.setTrial.mockImplementation(async (_id, slot) => bookedLead({ slot, studentName: undefined }));
  r.bookedSlots.mockResolvedValue([]);
  r.recordEmailError.mockResolvedValue();
  r.saveReminderIds.mockResolvedValue();
  r.saveFollowupIds.mockResolvedValue();
  r.saveDetails.mockResolvedValue();
  r.markUnsubscribed.mockResolvedValue();
  send.mockImplementation(async (a) => ({ id: a.scheduledAt ? `rem_${a.scheduledAt.toISOString()}` : "now" }));
  cancel.mockResolvedValue();
});

const sentTo = (to: string) => send.mock.calls.map((c) => c[0]).filter((a) => a.to === to);

describe("pickSlot", () => {
  it("books the chosen time for the lead behind the link", async () => {
    expect(await pickSlot({ token: TOKEN, slot: SLOT }, NOW)).toEqual({ ok: true, slot: SLOT });
    expect(r.setTrial).toHaveBeenCalledWith(lead().id, SLOT);
  });

  it("confirms to the family with a calendar file and tells the owner", async () => {
    await pickSlot({ token: TOKEN, slot: SLOT }, NOW);
    const confirm = sentTo("dana@example.com").filter((a) => !a.scheduledAt);
    expect(confirm).toHaveLength(1);
    expect(confirm[0].ics).toContain("DTSTART:20270316T000000Z");
    expect(sentTo("owner@example.com")[0].ics).toContain("DTSTART:20270316T000000Z");
  });

  it("schedules reminders and remembers them", async () => {
    await pickSlot({ token: TOKEN, slot: SLOT }, NOW);
    expect(r.saveReminderIds).toHaveBeenCalledWith(lead().id, [
      "rem_2027-03-15T00:00:00.000Z",
      "rem_2027-03-15T23:00:00.000Z",
    ]);
  });

  it("stops the follow-up nudges once a time is booked", async () => {
    await pickSlot({ token: TOKEN, slot: SLOT }, NOW);
    expect(cancel.mock.calls.map((c) => c[0])).toEqual(["f1", "f2"]);
    expect(r.saveFollowupIds).toHaveBeenCalledWith(lead().id, []);
  });

  it("lets a family move their trial, cancelling the old reminders", async () => {
    r.getLead.mockResolvedValue(bookedLead({ reminderIds: ["old1", "old2"] }));
    expect(await pickSlot({ token: TOKEN, slot: OTHER }, NOW)).toEqual({ ok: true, slot: OTHER });
    expect(cancel.mock.calls.map((c) => c[0])).toEqual(["old1", "old2"]);
    expect(r.setTrial).toHaveBeenCalledWith(lead().id, OTHER);
  });

  it("does nothing when the family confirms the time they already have", async () => {
    r.getLead.mockResolvedValue(bookedLead());
    expect(await pickSlot({ token: TOKEN, slot: SLOT }, NOW)).toEqual({ ok: true, slot: SLOT });
    expect(r.setTrial).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("offers the remaining times when the slot was just taken", async () => {
    r.setTrial.mockRejectedValue(new repo.SlotTakenError());
    r.bookedSlots.mockResolvedValue([SLOT]);
    const res = await pickSlot({ token: TOKEN, slot: SLOT }, NOW);
    expect(res).toMatchObject({ ok: false, status: 409 });
    if (!res.ok && res.status === 409) expect(res.slots).not.toContain(SLOT);
    expect(send).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it.each([
    ["in the past", "2027-03-09T00:00:00.000Z"],
    ["off the grid", "2027-03-16T00:10:00.000Z"],
    ["outside the windows", "2027-03-16T08:00:00.000Z"],
    ["not a date", "soon"],
  ])("rejects a slot that is %s", async (_l, slot) => {
    expect(await pickSlot({ token: TOKEN, slot }, NOW)).toMatchObject({ ok: false, status: 400 });
    expect(r.setTrial).not.toHaveBeenCalled();
  });

  it.each(["", "garbage", `${lead().id}.deadbeef`])("rejects the forged link %j", async (token) => {
    expect(await pickSlot({ token, slot: SLOT }, NOW)).toMatchObject({ ok: false, status: 404 });
    expect(r.getLead).not.toHaveBeenCalled();
  });

  it("refuses to rebook a lead who is already a paying student", async () => {
    r.getLead.mockResolvedValue(bookedLead({ stage: "paying" }));
    expect(await pickSlot({ token: TOKEN, slot: OTHER }, NOW)).toMatchObject({ ok: false, status: 400 });
    expect(r.setTrial).not.toHaveBeenCalled();
  });

  it("keeps the booking and records the problem when email fails", async () => {
    send.mockRejectedValue(new Error("email down"));
    expect(await pickSlot({ token: TOKEN, slot: SLOT }, NOW)).toEqual({ ok: true, slot: SLOT });
    expect(r.recordEmailError).toHaveBeenCalledWith(lead().id, expect.stringContaining("email down"));
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

describe("saveLeadDetails", () => {
  it("stores the optional details for the lead behind the link", async () => {
    const res = await saveLeadDetails({ token: TOKEN, studentName: "Alex", grade: "11", currentScore: 560 });
    expect(res).toEqual({ ok: true });
    expect(r.saveDetails).toHaveBeenCalledWith(lead().id, { studentName: "Alex", grade: "11", currentScore: 560 });
  });
  it("rejects a forged link", async () => {
    expect(await saveLeadDetails({ token: "x", studentName: "Alex" })).toMatchObject({ ok: false, status: 404 });
    expect(r.saveDetails).not.toHaveBeenCalled();
  });
  it("rejects invalid details", async () => {
    expect(await saveLeadDetails({ token: TOKEN, currentScore: 999 })).toMatchObject({ ok: false, status: 400 });
  });
});

describe("unsubscribeLead", () => {
  it("cancels the pending nudges and marks the lead", async () => {
    expect(await unsubscribeLead(TOKEN)).toBe(true);
    expect(cancel.mock.calls.map((c) => c[0])).toEqual(["f1", "f2"]);
    expect(r.markUnsubscribed).toHaveBeenCalledWith(lead().id);
    expect(r.saveFollowupIds).toHaveBeenCalledWith(lead().id, []);
  });
  it("still marks the lead when a nudge cannot be cancelled", async () => {
    cancel.mockRejectedValue(new Error("already sent"));
    expect(await unsubscribeLead(TOKEN)).toBe(true);
    expect(r.markUnsubscribed).toHaveBeenCalled();
  });
  it("rejects a forged link", async () => {
    expect(await unsubscribeLead("nope")).toBe(false);
    expect(r.markUnsubscribed).not.toHaveBeenCalled();
  });
});
