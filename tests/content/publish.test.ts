import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/content/repo", () => ({
  claimNextApproved: vi.fn(),
  markPublished: vi.fn(),
  markFailed: vi.fn(),
  listUnnotifiedDrafts: vi.fn(),
  markNotified: vi.fn(),
}));
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn() }));

import * as repo from "@/lib/content/repo";
import { sendEmail } from "@/lib/email/send";
import { easternDate, runContent } from "@/lib/content/publish";
import type { Post } from "@/lib/content/schema";

const r = vi.mocked(repo);
const send = vi.mocked(sendEmail);

const post = (over: Partial<Post> = {}): Post => ({
  id: "aaaaaaaa-2222-3333-4444-555555555555",
  scheduledFor: "2027-03-10",
  kind: "question",
  topic: "Quadratics",
  caption: "Try it.\n\nFree trial lesson: link in bio.",
  slides: [{ blocks: [{ type: "text", text: "One" }] }, { blocks: [{ type: "cta" }] }],
  status: "approved",
  checkNote: "verified",
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

beforeEach(() => {
  vi.resetAllMocks();
  calls = [];
  failOn = () => null;
  process.env.META_PAGE_TOKEN = "page-token";
  process.env.OWNER_EMAIL = "owner@example.com";
  process.env.NEXT_PUBLIC_SITE_URL = "https://pispark.site";
  r.claimNextApproved.mockResolvedValue(null);
  r.listUnnotifiedDrafts.mockResolvedValue([]);
  r.markPublished.mockResolvedValue();
  r.markFailed.mockResolvedValue();
  r.markNotified.mockResolvedValue();
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
    if (call.method === "GET") return Response.json({ status_code: "FINISHED" });
    return Response.json({ id: `id${++n}` });
  });
});
afterEach(() => vi.unstubAllGlobals());

const NOW = new Date("2027-03-10T23:30:00Z");

describe("easternDate", () => {
  it("gives the calendar date in New York, not UTC", () => {
    expect(easternDate(new Date("2027-03-11T02:00:00Z"))).toBe("2027-03-10");
    expect(easternDate(new Date("2027-03-10T12:00:00Z"))).toBe("2027-03-10");
  });
});

describe("runContent: publishing", () => {
  it("publishes today's approved post to Instagram as a carousel and to Facebook", async () => {
    r.claimNextApproved.mockResolvedValue(post());
    const res = await runContent(NOW);
    expect(res.published).toBe(1);
    expect(r.claimNextApproved).toHaveBeenCalledWith("2027-03-10");

    const ig = calls.filter((c) => c.url.includes("/IG1/"));
    const children = ig.filter((c) => c.params.is_carousel_item === "true");
    expect(children.map((c) => c.params.image_url)).toEqual([
      "https://pispark.site/api/posts/aaaaaaaa-2222-3333-4444-555555555555/1",
      "https://pispark.site/api/posts/aaaaaaaa-2222-3333-4444-555555555555/2",
    ]);
    const carousel = ig.find((c) => c.params.media_type === "CAROUSEL")!;
    expect(carousel.params.children).toBe("id1,id2");
    expect(carousel.params.caption).toContain("link in bio");
    expect(ig.at(-1)!.url).toMatch(/\/IG1\/media_publish$/);

    const feed = calls.find((c) => c.url.endsWith("/PAGE1/feed"))!;
    expect(feed.params.message).toContain("https://pispark.site/?utm_source=facebook");
    expect(JSON.parse(feed.params["attached_media[0]"])).toHaveProperty("media_fbid");
    expect(r.markPublished).toHaveBeenCalledWith(post().id, expect.objectContaining({ igMediaId: expect.any(String), fbPostId: expect.any(String), error: null }));
  });

  it("sends a one-slide post to Instagram as a single image", async () => {
    r.claimNextApproved.mockResolvedValue(post({ slides: [{ blocks: [{ type: "text", text: "One" }] }] }));
    await runContent(NOW);
    const ig = calls.filter((c) => c.url.endsWith("/IG1/media"));
    expect(ig).toHaveLength(1);
    expect(ig[0].params.is_carousel_item).toBeUndefined();
    expect(ig[0].params.caption).toBeDefined();
  });

  it("never sends the access token in a URL", async () => {
    r.claimNextApproved.mockResolvedValue(post());
    await runContent(NOW);
    for (const c of calls.filter((x) => x.method === "POST")) expect(c.url).not.toContain("page-token");
  });

  it("still posts to Facebook, and says what failed, when Instagram refuses", async () => {
    r.claimNextApproved.mockResolvedValue(post());
    failOn = (c) => (c.url.includes("/IG1/") ? "Media could not be fetched" : null);
    const res = await runContent(NOW);
    expect(res.published).toBe(1);
    expect(r.markPublished).toHaveBeenCalledWith(post().id, expect.objectContaining({ igMediaId: null, fbPostId: expect.any(String), error: expect.stringContaining("Instagram") }));
    expect(send.mock.calls[0][0].subject).toMatch(/Instagram/);
  });

  it("marks the post failed and emails the owner when nothing went out", async () => {
    r.claimNextApproved.mockResolvedValue(post());
    failOn = (c) => (c.method === "POST" ? "Session has expired" : null);
    const res = await runContent(NOW);
    expect(res).toMatchObject({ published: 0, failed: 1 });
    expect(r.markFailed).toHaveBeenCalledWith(post().id, expect.stringContaining("Session has expired"));
    expect(send.mock.calls[0][0].to).toBe("owner@example.com");
  });

  it("puts the post back for tomorrow's run when the accounts are not reachable at all", async () => {
    r.claimNextApproved.mockResolvedValue(post());
    failOn = (c) => (c.url.endsWith("/me") ? "Invalid OAuth access token" : null);
    const res = await runContent(NOW);
    expect(res.failed).toBe(1);
    expect(r.markFailed).toHaveBeenCalledWith(post().id, expect.stringContaining("Invalid OAuth access token"));
  });

  it("does not claim anything while the accounts are not connected", async () => {
    delete process.env.META_PAGE_TOKEN;
    const res = await runContent(NOW);
    expect(res.connected).toBe(false);
    expect(r.claimNextApproved).not.toHaveBeenCalled();
  });

  it("does nothing when no approved post is due", async () => {
    expect(await runContent(NOW)).toMatchObject({ published: 0, failed: 0 });
    expect(calls).toHaveLength(0);
  });
});

describe("runContent: telling the owner about new drafts", () => {
  it("sends one email for a batch of new drafts and remembers it did", async () => {
    r.listUnnotifiedDrafts.mockResolvedValue([post({ status: "draft" }), post({ id: "bbbbbbbb-2222-3333-4444-555555555555", status: "draft" })]);
    const res = await runContent(NOW);
    expect(res.notified).toBe(2);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].text).toContain("https://pispark.site/owner/posts");
    expect(r.markNotified).toHaveBeenCalledWith([post().id, "bbbbbbbb-2222-3333-4444-555555555555"]);
  });

  it("will try again tomorrow if the email fails", async () => {
    r.listUnnotifiedDrafts.mockResolvedValue([post({ status: "draft" })]);
    send.mockRejectedValue(new Error("down"));
    const res = await runContent(NOW);
    expect(res.notified).toBe(0);
    expect(r.markNotified).not.toHaveBeenCalled();
  });
});
