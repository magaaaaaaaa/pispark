import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls: { at: number; kind: string; arg: unknown }[] = [];
let responses: { data: unknown; error: unknown }[] = [];
const next = () => responses.shift() ?? { data: { id: "ok" }, error: null };

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (arg: unknown) => {
        calls.push({ at: Date.now(), kind: "send", arg });
        return next();
      },
      cancel: async (arg: unknown) => {
        calls.push({ at: Date.now(), kind: "cancel", arg });
        return next();
      },
    };
  },
}));

import { MIN_GAP_MS, cancelEmail, sendEmail } from "@/lib/email/send";

const mail = { to: "dana@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };

beforeEach(() => {
  vi.useFakeTimers();
  // Start well clear of any call made by an earlier test.
  vi.setSystemTime(Date.now() + 60_000);
  calls.length = 0;
  responses = [];
  process.env.RESEND_API_KEY = "key";
});
afterEach(() => vi.useRealTimers());

describe("email service wrapper", () => {
  it("spaces out calls started at the same moment", async () => {
    const all = Promise.all([sendEmail(mail), sendEmail(mail), cancelEmail("x")]);
    await vi.runAllTimersAsync();
    await all;
    expect(calls).toHaveLength(3);
    expect(calls[1].at - calls[0].at).toBeGreaterThanOrEqual(MIN_GAP_MS);
    expect(calls[2].at - calls[1].at).toBeGreaterThanOrEqual(MIN_GAP_MS);
  });

  it("retries once when the service says we are going too fast", async () => {
    responses = [{ data: null, error: { name: "rate_limit_exceeded", message: "Too many requests", statusCode: 429 } }];
    const p = sendEmail(mail);
    await vi.runAllTimersAsync();
    expect(await p).toEqual({ id: "ok" });
    expect(calls).toHaveLength(2);
  });

  it("gives up after the second rate-limit answer", async () => {
    const limited = { data: null, error: { name: "rate_limit_exceeded", message: "Too many requests", statusCode: 429 } };
    responses = [limited, limited];
    const p = sendEmail(mail).catch((e: Error) => e.message);
    await vi.runAllTimersAsync();
    expect(await p).toBe("Too many requests");
    expect(calls).toHaveLength(2);
  });

  it("does not retry other errors", async () => {
    responses = [{ data: null, error: { name: "validation_error", message: "Invalid to", statusCode: 422 } }];
    const p = sendEmail(mail).catch((e: Error) => e.message);
    await vi.runAllTimersAsync();
    expect(await p).toBe("Invalid to");
    expect(calls).toHaveLength(1);
  });

  it("keeps going after a failed call", async () => {
    responses = [{ data: null, error: { message: "boom" } }];
    const first = sendEmail(mail).catch(() => "failed");
    const second = sendEmail(mail);
    await vi.runAllTimersAsync();
    expect(await first).toBe("failed");
    expect(await second).toEqual({ id: "ok" });
  });

  it("adds the one-click unsubscribe header when given a link", async () => {
    const p = sendEmail({ ...mail, unsubscribeUrl: "https://pispark.site/unsubscribe?l=t" });
    await vi.runAllTimersAsync();
    await p;
    expect(calls[0].arg).toMatchObject({ headers: { "List-Unsubscribe": "<https://pispark.site/unsubscribe?l=t>" } });
  });

  it("accepts the key under the name RESEND", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.RESEND = "key";
    const p = sendEmail(mail);
    await vi.runAllTimersAsync();
    expect(await p).toEqual({ id: "ok" });
    delete process.env.RESEND;
  });

  it("fails clearly when no key is configured", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendEmail(mail)).rejects.toThrow(/RESEND_API_KEY/);
  });
});
