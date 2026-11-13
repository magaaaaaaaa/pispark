import { describe, expect, it } from "vitest";
import { leadToken, readLeadToken } from "@/lib/funnel/token";

const ID = "11111111-2222-3333-4444-555555555555";
const SECRET = "test-secret";

describe("lead link token", () => {
  const token = leadToken(ID, SECRET);

  it("round-trips the lead id", () => {
    expect(readLeadToken(token, SECRET)).toBe(ID);
  });
  it("is safe to put in a URL", () => {
    expect(token).toMatch(/^[0-9a-f-]+\.[0-9a-f]+$/);
  });
  it("rejects a token for a different lead id with the same signature", () => {
    const [, sig] = token.split(".");
    expect(readLeadToken(`99999999-2222-3333-4444-555555555555.${sig}`, SECRET)).toBeNull();
  });
  it("rejects a token signed with another secret", () => {
    expect(readLeadToken(leadToken(ID, "other"), SECRET)).toBeNull();
  });
  it.each([undefined, null, "", "abc", ID, `${ID}.`, "a.b.c"])("rejects %j", (bad) => {
    expect(readLeadToken(bad as string | undefined, SECRET)).toBeNull();
  });
  it("rejects everything when no secret is configured", () => {
    expect(readLeadToken(leadToken(ID, ""), "")).toBeNull();
  });
});
