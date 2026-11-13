import { beforeEach, describe, expect, it, vi } from "vitest";
import { lead, bookedLead } from "../leads/fixtures";

vi.mock("@/lib/leads/repo", () => ({
  listNewLeads: vi.fn(),
  claimFollowUp: vi.fn(),
  recordEmailError: vi.fn(),
}));
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn() }));

import * as repo from "@/lib/leads/repo";
import { sendEmail } from "@/lib/email/send";
import { FOLLOWUP_DAYS, dueFollowUp, runFollowUps } from "@/lib/funnel/followups";

const r = vi.mocked(repo);
const send = vi.mocked(sendEmail);
const CREATED = "2027-03-01T10:00:00.000Z";
const daysAfter = (d: number) => new Date(new Date(CREATED).getTime() + d * 86_400_000);

beforeEach(() => {
  vi.resetAllMocks();
  process.env.SESSION_SECRET = "test-secret";
  process.env.NEXT_PUBLIC_SITE_URL = "https://pispark.site";
  r.claimFollowUp.mockResolvedValue(true);
  r.recordEmailError.mockResolvedValue();
  send.mockResolvedValue({ id: "x" });
});

describe("dueFollowUp", () => {
  it("nudges on days 1, 3, 6, 10 and 14", () => {
    expect([...FOLLOWUP_DAYS]).toEqual([1, 3, 6, 10, 14]);
  });
  it("is not due before the first day has passed", () => {
    expect(dueFollowUp(lead({ createdAt: CREATED }), daysAfter(0.9))).toBeNull();
  });
  it("is the first nudge once a day has passed", () => {
    expect(dueFollowUp(lead({ createdAt: CREATED }), daysAfter(1.1))).toBe(0);
  });
  it("waits for day 3 after the first nudge went out", () => {
    const l = lead({ createdAt: CREATED, followupsSent: 1 });
    expect(dueFollowUp(l, daysAfter(2))).toBeNull();
    expect(dueFollowUp(l, daysAfter(3.2))).toBe(1);
  });
  it("sends only one nudge per run even when several days were missed", () => {
    expect(dueFollowUp(lead({ createdAt: CREATED }), daysAfter(12))).toBe(0);
  });
  it("stops after the fifth nudge", () => {
    expect(dueFollowUp(lead({ createdAt: CREATED, followupsSent: 5 }), daysAfter(30))).toBeNull();
  });
  it.each([
    ["booked", bookedLead({ createdAt: CREATED })],
    ["unsubscribed", lead({ createdAt: CREATED, unsubscribedAt: "2027-03-02T00:00:00.000Z" })],
    ["flagged as suspect", lead({ createdAt: CREATED, flagged: "honeypot" })],
    ["lost", lead({ createdAt: CREATED, stage: "lost" })],
  ])("never nudges a lead that is %s", (_label, l) => {
    expect(dueFollowUp(l, daysAfter(5))).toBeNull();
  });
});

describe("runFollowUps", () => {
  it("sends the due nudge to each lead and counts them", async () => {
    r.listNewLeads.mockResolvedValue([
      lead({ createdAt: CREATED }),
      lead({ id: "22222222-2222-3333-4444-555555555555", email: "sam@example.com", createdAt: CREATED, followupsSent: 1 }),
    ]);
    expect(await runFollowUps(daysAfter(4))).toEqual({ sent: 2, failed: 0, skipped: 0 });
    expect(send.mock.calls.map((c) => c[0].to)).toEqual(["dana@example.com", "sam@example.com"]);
    expect(r.claimFollowUp).toHaveBeenCalledWith(lead().id, 0);
    expect(r.claimFollowUp).toHaveBeenCalledWith("22222222-2222-3333-4444-555555555555", 1);
  });

  it("puts the unsubscribe link and the postal address in the nudge", async () => {
    r.listNewLeads.mockResolvedValue([lead({ createdAt: CREATED })]);
    await runFollowUps(daysAfter(2));
    const mail = send.mock.calls[0][0];
    expect(mail.text).toMatch(/https:\/\/pispark\.site\/unsubscribe\?l=/);
    expect(mail.unsubscribeUrl).toMatch(/^https:\/\/pispark\.site\/unsubscribe\?l=/);
    expect(mail.text).toContain("Syganak 4, Astana 010000, Kazakhstan");
  });

  it("skips a lead whose nudge another run already claimed, or whose state just changed", async () => {
    r.listNewLeads.mockResolvedValue([lead({ createdAt: CREATED })]);
    r.claimFollowUp.mockResolvedValue(false);
    expect(await runFollowUps(daysAfter(2))).toEqual({ sent: 0, failed: 0, skipped: 1 });
    expect(send).not.toHaveBeenCalled();
  });

  it("skips leads with nothing due", async () => {
    r.listNewLeads.mockResolvedValue([lead({ createdAt: CREATED })]);
    expect(await runFollowUps(daysAfter(0.5))).toEqual({ sent: 0, failed: 0, skipped: 1 });
    expect(r.claimFollowUp).not.toHaveBeenCalled();
  });

  it("records a failed send and carries on with the next lead", async () => {
    r.listNewLeads.mockResolvedValue([
      lead({ createdAt: CREATED }),
      lead({ id: "22222222-2222-3333-4444-555555555555", email: "sam@example.com", createdAt: CREATED }),
    ]);
    send.mockRejectedValueOnce(new Error("bounced"));
    expect(await runFollowUps(daysAfter(2))).toEqual({ sent: 1, failed: 1, skipped: 0 });
    expect(r.recordEmailError).toHaveBeenCalledWith(lead().id, expect.stringContaining("bounced"));
  });
});
