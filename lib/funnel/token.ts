import { createHmac, timingSafeEqual } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sign = (id: string, secret: string) =>
  createHmac("sha256", secret).update(`lead.${id}`).digest("hex").slice(0, 32);

/**
 * The value put in links we email to a family ("pick a time", "unsubscribe").
 * It names their lead and proves the link came from us, so nobody can act on
 * another family's lead by guessing ids.
 */
export function leadToken(id: string, secret: string): string {
  return `${id}.${sign(id, secret)}`;
}

/** The lead id if the token is genuine, otherwise null. */
export function readLeadToken(token: string | undefined | null, secret: string): string | null {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [id, signature] = parts;
  if (!UUID.test(id)) return null;
  const expected = Buffer.from(sign(id, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return id;
}

export const tokenSecret = () => process.env.SESSION_SECRET ?? "";
