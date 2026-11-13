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
  };
});
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn() }));

import * as repo from "@/lib/leads/repo";
import { sendEmail } from "@/lib/email/send";
import { createSessionToken } from "@/lib/admin/session";
import { login, sendOffer, setStage } from "@/app/owner/actions";

const r = vi.mocked(repo);
const send = vi.mocked(sendEmail);
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
