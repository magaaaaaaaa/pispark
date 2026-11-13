import { beforeEach, describe, expect, it, vi } from "vitest";
import { lead } from "../leads/fixtures";

const jar = new Map<string, string>();
const cookieSet = vi.fn((name: string, value: string) => void jar.set(name, value));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: cookieSet,
    delete: (name: string) => void jar.delete(name),
  }),
  headers: async () => new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/leads/repo", () => {
  class SlotTakenError extends Error {}
  return {
    SlotTakenError,
    getLead: vi.fn(),
    updateStage: vi.fn(),
    saveOwnerNotes: vi.fn(),
    saveReminderIds: vi.fn(),
    countRecentLoginFailures: vi.fn(),
    recordLoginFailure: vi.fn(),
  };
});
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn(), cancelEmail: vi.fn() }));

import * as repo from "@/lib/leads/repo";
import { cancelEmail, sendEmail } from "@/lib/email/send";
import { createSessionToken } from "@/lib/admin/session";
import { login, sendOffer, setStage } from "@/app/owner/actions";

const r = vi.mocked(repo);
const send = vi.mocked(sendEmail);
const cancel = vi.mocked(cancelEmail);
const ID = lead().id;
const NOTES = "Strong on linear equations. We will focus on quadratics first.";

const form = (password: string) => {
  const f = new FormData();
  f.set("password", password);
  return f;
};
const signIn = () => jar.set("pispark_owner", createSessionToken("test-secret", new Date()));

beforeEach(() => {
  vi.clearAllMocks();
  jar.clear();
  process.env.ADMIN_PASSWORD = "correct horse battery";
  process.env.SESSION_SECRET = "test-secret";
  process.env.NEXT_PUBLIC_SITE_URL = "https://pispark.site";
  r.getLead.mockResolvedValue(lead());
  r.updateStage.mockResolvedValue();
  r.saveOwnerNotes.mockResolvedValue();
  send.mockResolvedValue({ id: "e1" });
  cancel.mockResolvedValue();
  r.saveReminderIds.mockResolvedValue();
  r.countRecentLoginFailures.mockResolvedValue(0);
  r.recordLoginFailure.mockResolvedValue();
});

describe("login", () => {
  it("sets a session cookie and opens the owner area for the right password", async () => {
    await expect(login(null, form("correct horse battery"))).rejects.toThrow("REDIRECT:/owner");
    expect(cookieSet).toHaveBeenCalledWith(
      "pispark_owner",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: "lax" }),
    );
  });
  it("sets no cookie for a wrong password", async () => {
    expect(await login(null, form("wrong"))).toEqual({ error: "Wrong password." });
    expect(cookieSet).not.toHaveBeenCalled();
  });
  it("records a failed attempt against the visitor's address", async () => {
    await login(null, form("wrong"));
    expect(r.recordLoginFailure).toHaveBeenCalledWith("9.9.9.9");
  });
  it("locks out an address after five recent failures, even with the right password", async () => {
    r.countRecentLoginFailures.mockResolvedValue(5);
    const res = await login(null, form("correct horse battery"));
    expect(res.error).toMatch(/Too many attempts/);
    expect(cookieSet).not.toHaveBeenCalled();
  });
  it("still lets the owner in when the attempt counter itself is unavailable", async () => {
    r.countRecentLoginFailures.mockRejectedValue(new Error("db down"));
    await expect(login(null, form("correct horse battery"))).rejects.toThrow("REDIRECT:/owner");
  });
  it("refuses everyone when no password is configured", async () => {
    process.env.ADMIN_PASSWORD = "";
    expect(await login(null, form(""))).toHaveProperty("error");
    expect(cookieSet).not.toHaveBeenCalled();
  });
});

describe("setStage", () => {
  it("sends a visitor without a session to the login page and changes nothing", async () => {
    await expect(setStage(ID, "paying")).rejects.toThrow("REDIRECT:/owner/login");
    expect(r.updateStage).not.toHaveBeenCalled();
  });
  it("changes the stage for the owner", async () => {
    signIn();
    expect(await setStage(ID, "paying")).toEqual({ ok: true });
    expect(r.updateStage).toHaveBeenCalledWith(ID, "paying");
  });
  it.each(["lost", "not_now"] as const)("cancels pending reminders when a lead becomes %s", async (stage) => {
    signIn();
    r.getLead.mockResolvedValue(lead({ reminderIds: ["rem_1", "rem_2"] }));
    expect(await setStage(ID, stage)).toEqual({ ok: true });
    expect(cancel.mock.calls.map((c) => c[0])).toEqual(["rem_1", "rem_2"]);
    expect(r.saveReminderIds).toHaveBeenCalledWith(ID, []);
  });
  it("keeps reminders when a lead moves forward", async () => {
    signIn();
    r.getLead.mockResolvedValue(lead({ reminderIds: ["rem_1"] }));
    await setStage(ID, "trial_done");
    expect(cancel).not.toHaveBeenCalled();
  });
  it("still changes the stage, and says so, when a reminder cannot be cancelled", async () => {
    signIn();
    r.getLead.mockResolvedValue(lead({ reminderIds: ["rem_1"] }));
    cancel.mockRejectedValue(new Error("already sent"));
    const res = await setStage(ID, "lost");
    expect(r.updateStage).toHaveBeenCalledWith(ID, "lost");
    expect(res).toMatchObject({ ok: false });
    if (!res.ok) expect(res.error).toMatch(/reminder/);
  });
  it("rejects a stage that does not exist", async () => {
    signIn();
    // @ts-expect-error deliberately invalid
    expect(await setStage(ID, "vip")).toMatchObject({ ok: false });
    expect(r.updateStage).not.toHaveBeenCalled();
  });
  it("explains when a lost lead cannot be revived because its slot was rebooked", async () => {
    signIn();
    r.updateStage.mockRejectedValue(new repo.SlotTakenError());
    const res = await setStage(ID, "trial_booked");
    expect(res).toMatchObject({ ok: false });
    if (!res.ok) expect(res.error).toMatch(/time has since been booked/);
  });
});

describe("sendOffer", () => {
  it("requires a session", async () => {
    await expect(sendOffer(ID, NOTES)).rejects.toThrow("REDIRECT:/owner/login");
    expect(send).not.toHaveBeenCalled();
  });
  it("refuses notes shorter than 20 characters and sends nothing", async () => {
    signIn();
    expect(await sendOffer(ID, "Too short")).toMatchObject({ ok: false });
    expect(send).not.toHaveBeenCalled();
    expect(r.updateStage).not.toHaveBeenCalled();
  });
  it("saves the notes, emails the offer and moves the lead to offer_sent", async () => {
    signIn();
    expect(await sendOffer(ID, NOTES)).toEqual({ ok: true });
    expect(r.saveOwnerNotes).toHaveBeenCalledWith(ID, NOTES);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({ to: "dana@example.com" });
    expect(send.mock.calls[0][0].text).toContain(NOTES);
    expect(r.updateStage).toHaveBeenCalledWith(ID, "offer_sent");
  });
  it("copies the parent when the lead has a parent email", async () => {
    signIn();
    r.getLead.mockResolvedValue(lead({ role: "student", parentEmail: "parent@example.com" }));
    await sendOffer(ID, NOTES);
    expect(send.mock.calls[0][0].cc).toBe("parent@example.com");
  });
  it("leaves the stage alone and keeps the notes when the email fails", async () => {
    signIn();
    send.mockRejectedValue(new Error("email service down"));
    const res = await sendOffer(ID, NOTES);
    expect(res).toMatchObject({ ok: false });
    expect(r.saveOwnerNotes).toHaveBeenCalledWith(ID, NOTES);
    expect(r.updateStage).not.toHaveBeenCalled();
  });
  it("reports a lead that does not exist", async () => {
    signIn();
    r.getLead.mockResolvedValue(null);
    expect(await sendOffer(ID, NOTES)).toMatchObject({ ok: false });
    expect(send).not.toHaveBeenCalled();
  });
});
