import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureInput, lead, bookedLead } from "../leads/fixtures";

vi.mock("@/lib/leads/repo", () => {
  class DuplicateLeadError extends Error {}
  return {
    DuplicateLeadError,
    createLead: vi.fn(),
    findOpenByEmail: vi.fn(),
    bookedSlots: vi.fn(),
    countRecentByIp: vi.fn(),
    recordEmailError: vi.fn(),
  };
});
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn() }));

import * as repo from "@/lib/leads/repo";
import { sendEmail } from "@/lib/email/send";
import { captureLead } from "@/lib/funnel/capture";
import { readLeadToken } from "@/lib/funnel/token";

const r = vi.mocked(repo);
const send = vi.mocked(sendEmail);
const NOW = new Date("2027-03-10T00:00:00Z");
const ctx = { ip: "1.2.3.4", now: NOW };
const DAY = 86_400_000;

beforeEach(() => {
  vi.resetAllMocks();
  process.env.OWNER_EMAIL = "owner@example.com";
  process.env.SESSION_SECRET = "test-secret";
  process.env.NEXT_PUBLIC_SITE_URL = "https://pispark.site";
  r.createLead.mockImplementation(async (input, _ip, flagged) =>
    lead({
      contactName: input.firstName,
      email: input.email,
      role: input.role,
      parentEmail: input.parentEmail,
      flagged: flagged ?? null,
    }),
  );
  r.findOpenByEmail.mockResolvedValue(null);
  r.bookedSlots.mockResolvedValue([]);
  r.countRecentByIp.mockResolvedValue(0);
  r.recordEmailError.mockResolvedValue();
  send.mockResolvedValue({ id: "email_1" });
});

const sentTo = (to: string) => send.mock.calls.map((c) => c[0]).filter((a) => a.to === to);

describe("captureLead: a new family", () => {
  it("saves the lead from a name and an email and hands back a link token for it", async () => {
    const res = await captureLead(captureInput(), ctx);
    expect(res).toMatchObject({ ok: true, existing: false });
    expect(r.createLead).toHaveBeenCalledTimes(1);
    if (res.ok) expect(readLeadToken(res.token, "test-secret")).toBe(lead().id);
  });

  it("replies at once with one-tap times and a link to all times", async () => {
    await captureLead(captureInput(), ctx);
    const [reply] = sentTo("dana@example.com");
    const links = reply.text.match(/https:\/\/pispark\.site\/pick\?l=[^\s]+/g) ?? [];
    expect(links.filter((l) => l.includes("&slot=")).length).toBe(3);
    expect(links.some((l) => !l.includes("&slot="))).toBe(true);
    expect(reply.unsubscribeUrl).toMatch(/^https:\/\/pispark\.site\/unsubscribe\?l=/);
  });

  it("still replies when the times cannot be loaded", async () => {
    r.bookedSlots.mockRejectedValue(new Error("db hiccup"));
    expect((await captureLead(captureInput(), ctx)).ok).toBe(true);
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
    expect((await captureLead(captureInput(), ctx)).ok).toBe(true);
    expect(r.recordEmailError).toHaveBeenCalledWith(lead().id, expect.stringContaining("email service down"));
  });

  it("names the failing field for invalid input", async () => {
    const res = await captureLead({ ...captureInput(), email: "nope" }, ctx);
    expect(res).toMatchObject({ ok: false, status: 400 });
    if (!res.ok && res.status === 400) expect(res.issues.map((i) => i.path)).toContain("email");
    expect(r.createLead).not.toHaveBeenCalled();
  });
});

describe("captureLead: never losing a real person", () => {
  it("saves a sign-up that tripped the hidden field, flagged and without emails", async () => {
    const res = await captureLead({ ...captureInput(), website: "filled by autofill" }, ctx);
    expect(res).toEqual({ ok: true, token: "", existing: false });
    expect(r.createLead).toHaveBeenCalledWith(expect.objectContaining({ email: "dana@example.com" }), "1.2.3.4", "honeypot");
    expect(send).not.toHaveBeenCalled();
  });

  it("saves a sign-up over the hourly limit, flagged and without emails", async () => {
    r.countRecentByIp.mockResolvedValue(5);
    const res = await captureLead(captureInput(), ctx);
    expect(res).toEqual({ ok: true, token: "", existing: false });
    expect(r.createLead).toHaveBeenCalledWith(expect.anything(), "1.2.3.4", "rate_limited");
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses outright only when one address floods the form", async () => {
    r.countRecentByIp.mockResolvedValue(30);
    expect(await captureLead(captureInput(), ctx)).toEqual({ ok: false, status: 429 });
    expect(r.createLead).not.toHaveBeenCalled();
  });

  it("still saves the lead when the rate-limit check itself fails", async () => {
    r.countRecentByIp.mockRejectedValue(new Error("db hiccup"));
    expect(await captureLead(captureInput(), ctx)).toMatchObject({ ok: true, existing: false });
    expect(r.createLead).toHaveBeenCalledWith(expect.anything(), "1.2.3.4", undefined);
  });

  it("still saves the lead when the returning-family check fails", async () => {
    r.findOpenByEmail.mockRejectedValue(new Error("db hiccup"));
    expect(await captureLead(captureInput(), ctx)).toMatchObject({ ok: true, existing: false });
    expect(r.createLead).toHaveBeenCalledTimes(1);
  });

  it("saves the lead and tells the owner when links cannot be signed", async () => {
    process.env.SESSION_SECRET = "";
    const res = await captureLead(captureInput(), ctx);
    expect(res).toEqual({ ok: true, token: "", existing: false });
    expect(r.createLead).toHaveBeenCalledTimes(1);
    expect(r.recordEmailError).toHaveBeenCalledWith(lead().id, expect.stringContaining("SESSION_SECRET"));
    expect(sentTo("owner@example.com")).toHaveLength(1);
  });
});

describe("captureLead: a family that signs up again", () => {
  it("never hands the existing lead's link to whoever typed the email", async () => {
    r.findOpenByEmail.mockResolvedValue(lead());
    const res = await captureLead(captureInput(), ctx);
    expect(res).toEqual({ ok: true, token: "", existing: true });
    expect(r.createLead).not.toHaveBeenCalled();
    expect(r.findOpenByEmail).toHaveBeenCalledWith("dana@example.com", new Date(NOW.getTime() - 30 * DAY));
  });

  it("emails the link again to the address on file instead", async () => {
    r.findOpenByEmail.mockResolvedValue(lead());
    await captureLead(captureInput(), ctx);
    expect(sentTo("dana@example.com")).toHaveLength(1);
    expect(sentTo("dana@example.com")[0].text).toMatch(/https:\/\/pispark\.site\/pick\?l=/);
    expect(sentTo("owner@example.com")).toHaveLength(0);
  });

  it("reminds a family that already booked of their time and how to change it", async () => {
    r.findOpenByEmail.mockResolvedValue(bookedLead());
    await captureLead(captureInput(), ctx);
    const [mail] = sentTo("dana@example.com");
    expect(mail.text).toContain("8:00 PM");
    expect(mail.text).toMatch(/https:\/\/pispark\.site\/pick\?l=/);
  });

  it("treats two tabs submitting at once as one lead", async () => {
    r.createLead.mockRejectedValue(new repo.DuplicateLeadError());
    expect(await captureLead(captureInput(), ctx)).toEqual({ ok: true, token: "", existing: true });
    expect(send).not.toHaveBeenCalled();
  });
});
