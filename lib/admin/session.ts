import { createHmac, timingSafeEqual } from "node:crypto";

export const OWNER_COOKIE = "pispark_owner";
export const SESSION_DAYS = 7;

const sign = (expires: string, secret: string) =>
  createHmac("sha256", secret).update(`owner.${expires}`).digest("hex");

/** "<expiry ms>.<hmac>" — there is one owner, so the token carries no identity. */
export function createSessionToken(secret: string, now: Date): string {
  const expires = String(now.getTime() + SESSION_DAYS * 86_400_000);
  return `${expires}.${sign(expires, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string, now: Date): boolean {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expires, signature] = parts;
  if (!/^\d+$/.test(expires)) return false;
  const expected = Buffer.from(sign(expires, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  return Number(expires) > now.getTime();
}

/** Constant-time comparison that does not leak the length of the real password. */
export function passwordMatches(given: string, actual: string): boolean {
  if (!actual) return false;
  const a = createHmac("sha256", "pispark-password").update(given).digest();
  const b = createHmac("sha256", "pispark-password").update(actual).digest();
  return timingSafeEqual(a, b);
}
