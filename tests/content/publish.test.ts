import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/content/repo", () => ({
  reclaimStale: vi.fn(),
  expireMissed: vi.fn(),
  claimNextApproved: vi.fn(),
  saveNetworkId: vi.fn(),
  markPublished: vi.fn(),
  markFailed: vi.fn(),
  sendBackToDraft: vi.fn(),
  countDrafts: vi.fn(),
  countApproved: vi.fn(),
  listUnnotifiedDrafts: vi.fn(),
  markNotified: vi.fn(),
}));
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn() }));

import * as repo from "@/lib/content/repo";
import { sendEmail } from "@/lib/email/send";
import { contentHash } from "@/lib/content/hash";
import { easternDate, previousDay, runContent } from "@/lib/content/publish";
import type { Post } from "@/lib/content/schema";

const r = vi.mocked(repo);
const send = vi.mocked(sendEmail);

const base = {
  kind: "question" as const,
  topic: "Quadratics",
  caption: "Try it.\n\nFree trial lesson: link in bio.",
  slides: [{ blocks: [{ type: "text" as const, text: "One" }] }, { blocks: [{ type: "cta" as const }] }],
};
const post = (over: Partial<Post> = {}): Post => ({
  id: "aaaaaaaa-2222-3333-4444-555555555555",
  scheduledFor: "2027-03-10",
  ...base,
  status: "publishing",
  checkNote: "verified",
  approvedHash: contentHash(base),
  publishError: null,
  igMediaId: null,
  fbPostId: null,
  publishedAt: null,
  createdAt: "2027-03-01T00:00:00.000Z",
  ...over,
});

type Call = { url: string; method: string; params: Record<string, string> };
let calls: Call[] = [];
let failOn: (c: Call) => string | null = () => null;
let statusCode: string | undefined = "FINISHED";

beforeEach(() => {
  vi.resetAllMocks();
  calls = [];
  failOn = () => null;
  statusCode = "FINISHED";
  process.env.META_PAGE_TOKEN = "page-token";
  process.env.OWNER_EMAIL = "owner@example.com";
  process.env.NEXT_PUBLIC_SITE_URL = "https://pispark.site";
  r.reclaimStale.mockResolvedValue([]);
  r.expireMissed.mockResolvedValue([]);
  r.claimNextApproved.mockResolvedValue(null);
  r.countDrafts.mockResolvedValue(0);
  r.countApproved.mockResolvedValue(0);
  r.listUnnotifiedDrafts.mockResolvedValue([]);
  for (const f of [r.saveNetworkId, r.markPublished, r.markFailed, r.sendBackToDraft, r.markNotified]) {
    f.mockResolvedValue(undefined as never);
  }
  send.mockResolvedValue({ id: "e" });

  let n = 0;
  vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const params: Record<string, string> = Object.fromEntries(url.searchParams);
    if (init?.body) for (const [k, v] of new URLSearchParams(String(init.body))) params[k] = v;
    const call = { url: url.origin + url.pathname, method: init?.method ?? "GET", params };
    calls.push(call);
    const error = failOn(call);
    if (error) return new Response(JSON.stringify({ error: { message: error } }), { status: 400 });
    if (call.url.endsWith("/me")) {
      return Response.json({ id: "PAGE1", name: "PiSpark", instagram_business_account: { id: "IG1" } });
    }
    if (call.method === "GET") return Response.json(statusCode ? { status_code: statusCode } : {});
    return Response.json({ id: `id${++n}` });
  });
});
afterEach(() => vi.unstubAllGlobals());

const NOW = new Date("2027-03-10T23:30:00Z");
const subjects = () => send.mock.calls.map((c) => c[0].subject);

describe("dates", () => {
  it("uses the calendar date in New York, not UTC", () => {
    expect(easternDate(new Date("2027-03-11T02:00:00Z"))).toBe("2027-03-10");
  });
  it("steps back one day across a month boundary", () => {
    expect(previousDay("2027-03-01")).toBe("2027-02-28");
  });
});

describe("runContent: publishing", () => {
  it("publishes the due post to Instagram as a carousel and to Facebook", async () => {
    r.claimNextApproved.mockResolvedValue(post());
    const res = await runContent(NOW);
    expect(res.published).toBe(1);
    expect(r.claimNextApproved).toHaveBeenCalledWith("2027-03-09", "2027-03-10");

    const ig = calls.filter((c) => c.url.includes("/IG1/"));
    expect(ig.filter((c) => c.params.is_carousel_item === "true").map((c) => c.params.image_url)).toEqual([
      "https://pispark.site/api/posts/aaaaaaaa-2222-3333-4444-555555555555/1",
      "https://pispark.site/api/posts/aaaaaaaa-2222-3333-4444-555555555555/2",
    ]);
    expect(ig.find((c) => c.params.media_type === "CAROUSEL")!.params.children).toBe("id1,id2");
    expect(ig.at(-1)!.url).toMatch(/\/IG1\/media_publish$/);
    const feed = calls.find((c) => c.url.endsWith("/PAGE1/feed"))!;
    expect(feed.params.message).toContain("https://pispark.site/?utm_source=facebook");
    expect(r.markPublished).toHaveBeenCalledWith(post().id, null);
  });

  it("records each network's result the moment it succeeds", async () => {
    r.claimNextApproved.mockResolvedValue(post());
    await runContent(NOW);
    expect(r.saveNetworkId).toHaveBeenCalledWith(post().id, "ig", expect.any(String));
    expect(r.saveNetworkId).toHaveBeenCalledWith(post().id, "fb", expect.any(String));
  });

  it("never posts again to a network that already has the post", async () => {
    r.claimNextApproved.mockResolvedValue(post({ igMediaId: "already-there" }));
    await runContent(NOW);
    expect(calls.some((c) => c.url.includes("/IG1/"))).toBe(false);
    expect(calls.some((c) => c.url.endsWith("/PAGE1/feed"))).toBe(true);
    expect(r.markPublished).toHaveBeenCalledWith(post().id, null);
  });

  it("does not post twice when saving the final state fails after both networks succeeded", async () => {
    r.claimNextApproved.mockResolvedValue(post());
    r.markPublished.mockRejectedValue(new Error("db hiccup"));
    const res = await runContent(NOW);
    expect(res.failed).toBe(1);
    // Both ids were already stored, so "Try again" has nothing left to post.
    expect(r.saveNetworkId).toHaveBeenCalledTimes(2);
    expect(r.markFailed.mock.calls[0][1]).toMatch(/Check Instagram and Facebook/);
    expect(subjects()[0]).toMatch(/needs a look/);
  });

  it("sends a one-slide post to Instagram as a single image", async () => {
    const one = { ...base, slides: [base.slides[0]] };
    r.claimNextApproved.mockResolvedValue(post({ ...one, approvedHash: contentHash(one) }));
    await runContent(NOW);
    const ig = calls.filter((c) => c.url.endsWith("/IG1/media"));
    expect(ig).toHaveLength(1);
    expect(ig[0].params.is_carousel_item).toBeUndefined();
  });

  it("waits for Instagram to say the post is ready, and gives up if it never does", async () => {
    vi.useFakeTimers();
    statusCode = "IN_PROGRESS";
    r.claimNextApproved.mockResolvedValue(post());
    const p = runContent(NOW);
    await vi.runAllTimersAsync();
    await p;
    vi.useRealTimers();
    expect(calls.some((c) => c.url.endsWith("/media_publish"))).toBe(false);
    expect(r.saveNetworkId).not.toHaveBeenCalledWith(post().id, "ig", expect.anything());
  });

  it("keeps the access token out of every address", async () => {
    r.claimNextApproved.mockResolvedValue(post());
    await runContent(NOW);
    for (const c of calls) expect(JSON.stringify([c.url, c.params])).not.toContain("page-token");
  });

  it("still posts to Facebook, and says what failed, when Instagram refuses", async () => {
    r.claimNextApproved.mockResolvedValue(post());
    failOn = (c) => (c.url.includes("/IG1/") ? "Media could not be fetched" : null);
    const res = await runContent(NOW);
    expect(res.published).toBe(1);
    expect(r.markPublished).toHaveBeenCalledWith(post().id, expect.stringContaining("Instagram"));
    expect(subjects()[0]).toMatch(/Instagram/);
  });

  it("marks the post failed and emails the owner when nothing went out", async () => {
    r.claimNextApproved.mockResolvedValue(post());
    failOn = (c) => (c.method === "POST" ? "Session has expired" : null);
    expect(await runContent(NOW)).toMatchObject({ published: 0, failed: 1 });
    expect(r.markFailed).toHaveBeenCalledWith(post().id, expect.stringContaining("Session has expired"));
    expect(send.mock.calls[0][0].to).toBe("owner@example.com");
  });

  it("fails the post when the accounts cannot be reached at all", async () => {
    r.claimNextApproved.mockResolvedValue(post());
    failOn = (c) => (c.url.endsWith("/me") ? "Invalid OAuth access token" : null);
    expect((await runContent(NOW)).failed).toBe(1);
    expect(r.markFailed).toHaveBeenCalledWith(post().id, expect.stringContaining("Invalid OAuth access token"));
  });

  it("does nothing when no approved post is due", async () => {
    expect(await runContent(NOW)).toMatchObject({ published: 0, failed: 0 });
    expect(calls).toHaveLength(0);
  });
});

describe("runContent: only what the owner approved", () => {
  it("refuses a post whose content changed after it was approved", async () => {
    r.claimNextApproved.mockResolvedValue(post({ caption: "Edited behind the owner's back. Link in bio." }));
    const res = await runContent(NOW);
    expect(res.published).toBe(0);
    expect(calls).toHaveLength(0);
    expect(r.sendBackToDraft).toHaveBeenCalledWith(post().id, expect.stringContaining("changed after"));
    expect(subjects()[0]).toMatch(/approve/i);
  });

  it("refuses a post that was marked approved without going through approval", async () => {
    r.claimNextApproved.mockResolvedValue(post({ approvedHash: null }));
    await runContent(NOW);
    expect(calls).toHaveLength(0);
    expect(r.sendBackToDraft).toHaveBeenCalled();
  });

  it("refuses a post that no longer passes the content rules", async () => {
    const bad = { ...base, caption: "We guarantee a 1500. Link in bio." };
    r.claimNextApproved.mockResolvedValue(post({ ...bad, approvedHash: contentHash(bad) }));
    await runContent(NOW);
    expect(calls).toHaveLength(0);
    expect(r.sendBackToDraft).toHaveBeenCalledWith(post().id, expect.stringContaining("promises a result"));
  });
});

describe("runContent: nothing left hanging", () => {
  it("flags a post whose publishing was interrupted, without posting it again", async () => {
    r.reclaimStale.mockResolvedValue([post()]);
    const res = await runContent(NOW);
    expect(r.reclaimStale).toHaveBeenCalledWith(new Date(NOW.getTime() - 15 * 60_000));
    expect(res.failed).toBe(1);
    expect(subjects()[0]).toMatch(/needs a look/);
    expect(send.mock.calls[0][0].text).toMatch(/Check Instagram and Facebook/);
  });

  it("retires approved posts whose day has passed, and says so", async () => {
    r.expireMissed.mockResolvedValue([post({ scheduledFor: "2027-03-05", status: "failed" })]);
    await runContent(NOW);
    expect(r.expireMissed).toHaveBeenCalledWith("2027-03-09");
    expect(send.mock.calls[0][0].text).toContain("2027-03-05");
  });

  it("tells the owner when today had drafts but nothing approved", async () => {
    r.countDrafts.mockResolvedValue(1);
    await runContent(NOW);
    expect(r.countDrafts).toHaveBeenCalledWith("2027-03-10");
    expect(subjects()[0]).toMatch(/nothing was published today/i);
  });

  it("tells the owner when an approved post is waiting only for the accounts to be connected", async () => {
    delete process.env.META_PAGE_TOKEN;
    r.countApproved.mockResolvedValue(1);
    const res = await runContent(NOW);
    expect(res.connected).toBe(false);
    expect(r.claimNextApproved).not.toHaveBeenCalled();
    expect(subjects()[0]).toMatch(/not connected/i);
  });
});

describe("runContent: telling the owner about new drafts", () => {
  it("sends one email for a batch of new drafts and remembers it did", async () => {
    r.listUnnotifiedDrafts.mockResolvedValue([post({ status: "draft" }), post({ id: "bbbbbbbb-2222-3333-4444-555555555555", status: "draft" })]);
    const res = await runContent(NOW);
    expect(res.notified).toBe(2);
    expect(send.mock.calls.at(-1)![0].text).toContain("https://pispark.site/owner/posts");
    expect(r.markNotified).toHaveBeenCalledWith([post().id, "bbbbbbbb-2222-3333-4444-555555555555"]);
  });

  it("will try again tomorrow if the email fails", async () => {
    r.listUnnotifiedDrafts.mockResolvedValue([post({ status: "draft" })]);
    send.mockRejectedValue(new Error("down"));
    expect((await runContent(NOW)).notified).toBe(0);
    expect(r.markNotified).not.toHaveBeenCalled();
  });
});
