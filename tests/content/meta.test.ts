import { beforeEach, describe, expect, it, vi } from "vitest";
import { forgetPage, instagramCounts, metaAccounts } from "@/lib/content/meta";

type Call = { path: string; auth: string };
let calls: Call[] = [];
let answer: (path: string, auth: string) => Response;

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
const fail = (message: string) => json({ error: { message } }, 400);

beforeEach(() => {
  forgetPage();
  calls = [];
  process.env.META_PAGE_TOKEN = "TOKEN";
  delete process.env.META_PAGE_NAME;
  vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const auth = String((init?.headers as Record<string, string>).Authorization).replace("Bearer ", "");
    calls.push({ path: url.pathname, auth });
    return answer(url.pathname, auth);
  });
});

describe("metaAccounts", () => {
  it("uses a Page token as it is", async () => {
    answer = () => json({ id: "PAGE1", name: "PiSpark Math", instagram_business_account: { id: "IG1" } });
    expect(await metaAccounts()).toEqual({ pageId: "PAGE1", pageName: "PiSpark Math", igUserId: "IG1" });
    expect(calls).toEqual([{ path: "/me", auth: "TOKEN" }]);
  });

  it("with a system user token, finds the Page that has Instagram linked and acts with its token", async () => {
    answer = (path) =>
      path === "/me"
        ? fail("(#100) Tried accessing nonexisting field (instagram_business_account) on node type (User)")
        : path === "/me/accounts"
          ? json({
              data: [
                { id: "P0", name: "PiSpark", access_token: "T0" },
                { id: "P1", name: "PiSpark Math", access_token: "T1", instagram_business_account: { id: "IG1" } },
              ],
            })
          : json({ like_count: 4, comments_count: 1 });
    expect(await metaAccounts()).toEqual({ pageId: "P1", pageName: "PiSpark Math", igUserId: "IG1" });
    await instagramCounts("M1");
    expect(calls.at(-1)).toEqual({ path: "/M1", auth: "T1" });
  });

  it("takes the Page named in META_PAGE_NAME when there is one", async () => {
    process.env.META_PAGE_NAME = "pispark";
    answer = (path) =>
      path === "/me"
        ? fail("Tried accessing nonexisting field (instagram_business_account)")
        : json({
            data: [
              { id: "P0", name: "PiSpark", access_token: "T0" },
              { id: "P1", name: "PiSpark Math", access_token: "T1", instagram_business_account: { id: "IG1" } },
            ],
          });
    expect((await metaAccounts()).pageId).toBe("P0");
  });

  it("explains a lost permission in words the owner can act on, and tries again next time", async () => {
    answer = () => fail("(#200) Any of the pages_read_engagement ... permission(s) must be granted");
    await expect(metaAccounts()).rejects.toThrow(/lost its access.*META_PAGE_TOKEN/);
    answer = () => json({ id: "PAGE1", name: "PiSpark Math" });
    expect((await metaAccounts()).pageId).toBe("PAGE1");
  });

  it("says so when the token cannot see any Page", async () => {
    answer = (path) => (path === "/me" ? fail("nonexisting field (instagram_business_account)") : json({ data: [] }));
    await expect(metaAccounts()).rejects.toThrow(/cannot see any Facebook Page/);
  });
});
