import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/admin/session";

const SECRET = "a-long-random-secret-for-tests";
const NOW = new Date("2027-01-01T00:00:00Z");
const DAY = 86_400_000;

describe("owner session token", () => {
  const token = createSessionToken(SECRET, NOW);

  it("is accepted when fresh", () => {
    expect(verifySessionToken(token, SECRET, NOW)).toBe(true);
  });
  it("is accepted on day six", () => {
    expect(verifySessionToken(token, SECRET, new Date(NOW.getTime() + 6 * DAY))).toBe(true);
  });
  it("is rejected after eight days", () => {
    expect(verifySessionToken(token, SECRET, new Date(NOW.getTime() + 8 * DAY))).toBe(false);
  });
  it("is rejected when one character is changed", () => {
    const last = token.at(-1) === "0" ? "1" : "0";
    expect(verifySessionToken(token.slice(0, -1) + last, SECRET, NOW)).toBe(false);
  });
  it("is rejected when the expiry is pushed forward by hand", () => {
    const [, sig] = token.split(".");
    expect(verifySessionToken(`${NOW.getTime() + 365 * DAY}.${sig}`, SECRET, NOW)).toBe(false);
  });
  it("is rejected when signed with another secret", () => {
    expect(verifySessionToken(createSessionToken("other-secret", NOW), SECRET, NOW)).toBe(false);
  });
  it.each([undefined, "", "abc", "1.2.3", "notanumber.deadbeef"])("rejects %j", (bad) => {
    expect(verifySessionToken(bad, SECRET, NOW)).toBe(false);
  });
  it("rejects everything when no secret is configured", () => {
    expect(verifySessionToken(createSessionToken("", NOW), "", NOW)).toBe(false);
  });
});
