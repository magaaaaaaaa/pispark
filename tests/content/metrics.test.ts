import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/content/repo", () => ({ listRecentlyPublished: vi.fn(), saveMetrics: vi.fn() }));

import * as repo from "@/lib/content/repo";
import { refreshMetrics } from "@/lib/content/metrics";
import { forgetPage } from "@/lib/content/meta";
import type { Post } from "@/lib/content/schema";

const r = vi.mocked(repo);
const post = (over: Partial<Post>): Post =>
  ({ id: "p1", status: "published", igMediaId: null, fbPostId: null, ...over }) as Post;

let fail: (url: string) => boolean = () => false;
const seen: string[] = [];

beforeEach(() => {
  vi.resetAllMocks();
  forgetPage();
  seen.length = 0;
  fail = () => false;
  process.env.META_PAGE_TOKEN = "page-token";
  vi.stubGlobal("fetch", async (input: string | URL) => {
    const url = String(input);
    seen.push(url);
    if (fail(url)) return new Response(JSON.stringify({ error: { message: "nope" } }), { status: 400 });
    if (url.includes("/ig1")) return Response.json({ like_count: 12, comments_count: 3 });
    if (url.includes("/fb1"))
      return Response.json({ reactions: { summary: { total_count: 5 } }, comments: { summary: { total_count: 1 } }, shares: { count: 2 } });
    return Response.json({});
  });
});

describe("refreshMetrics", () => {
  it("saves both networks' counts for a recent post", async () => {
    r.listRecentlyPublished.mockResolvedValue([post({ igMediaId: "ig1", fbPostId: "fb1" })]);
    const out = await refreshMetrics(new Date("2026-12-01T00:00:00Z"));
    expect(out).toEqual({ measured: 1, failed: 0 });
    expect(r.saveMetrics).toHaveBeenCalledWith("p1", { igLikes: 12, igComments: 3, fbReactions: 5, fbComments: 1, fbShares: 2 });
    // Only the last three weeks are asked for.
    expect(r.listRecentlyPublished.mock.calls[0][0].toISOString()).toBe("2026-11-10T00:00:00.000Z");
  });

  it("keeps Instagram's counts when Facebook fails", async () => {
    fail = (u) => u.includes("/fb1");
    r.listRecentlyPublished.mockResolvedValue([post({ igMediaId: "ig1", fbPostId: "fb1" })]);
    expect(await refreshMetrics(new Date())).toEqual({ measured: 1, failed: 1 });
    expect(r.saveMetrics).toHaveBeenCalledWith("p1", { igLikes: 12, igComments: 3 });
  });

  it("writes nothing for a post with no network ids, or when every read fails", async () => {
    fail = () => true;
    r.listRecentlyPublished.mockResolvedValue([post({}), post({ id: "p2", igMediaId: "ig1" })]);
    expect(await refreshMetrics(new Date())).toEqual({ measured: 0, failed: 1 });
    expect(r.saveMetrics).not.toHaveBeenCalled();
  });

  it("does nothing until Meta is connected", async () => {
    process.env.META_PAGE_TOKEN = "";
    expect(await refreshMetrics(new Date())).toEqual({ measured: 0, failed: 0 });
    expect(r.listRecentlyPublished).not.toHaveBeenCalled();
    expect(seen).toEqual([]);
  });
});
