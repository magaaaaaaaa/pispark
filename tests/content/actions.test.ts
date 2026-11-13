import { beforeEach, describe, expect, it, vi } from "vitest";

const guard = vi.hoisted(() => ({ requireOwnerPage: vi.fn() }));
vi.mock("@/lib/admin/guard", () => guard);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/content/repo", () => ({
  getPost: vi.fn(),
  listPosts: vi.fn(),
  setPostStatus: vi.fn(),
  updateCaption: vi.fn(),
}));
vi.mock("@/lib/content/meta", () => ({ metaConnected: vi.fn(), metaAccounts: vi.fn() }));

import * as repo from "@/lib/content/repo";
import * as meta from "@/lib/content/meta";
import { approveAll, approvePost, rejectPost, saveCaption, testConnection } from "@/app/owner/posts/actions";
import type { Post } from "@/lib/content/schema";

const r = vi.mocked(repo);
const m = vi.mocked(meta);
const ID = "aaaaaaaa-2222-3333-4444-555555555555";

const post = (over: Partial<Post> = {}): Post => ({
  id: ID,
  scheduledFor: "2027-03-10",
  kind: "strategy",
  topic: "Desmos",
  caption: "Try it. Free trial lesson: link in bio.",
  slides: [{ title: "A Desmos trick", blocks: [{ type: "text", text: "Type both equations and tap where they cross." }] }],
  status: "draft",
  checkNote: null,
  publishError: null,
  igMediaId: null,
  fbPostId: null,
  publishedAt: null,
  createdAt: "2027-03-01T00:00:00.000Z",
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  guard.requireOwnerPage.mockResolvedValue(undefined);
  r.getPost.mockResolvedValue(post());
  r.setPostStatus.mockResolvedValue(true);
  r.updateCaption.mockResolvedValue(true);
});

describe("owner actions on posts", () => {
  it("refuses everything without an owner session", async () => {
    guard.requireOwnerPage.mockRejectedValue(new Error("REDIRECT:/owner/login"));
    await expect(approvePost(ID)).rejects.toThrow("REDIRECT");
    await expect(saveCaption(ID, "x")).rejects.toThrow("REDIRECT");
    await expect(approveAll()).rejects.toThrow("REDIRECT");
    expect(r.setPostStatus).not.toHaveBeenCalled();
  });

  it("approves a draft that passes the content rules", async () => {
    expect(await approvePost(ID)).toEqual({ ok: true });
    expect(r.setPostStatus).toHaveBeenCalledWith(ID, "approved", ["draft", "failed"]);
  });

  it("will not approve a post that breaks the rules, and says why", async () => {
    r.getPost.mockResolvedValue(post({ caption: "We guarantee a 1500." }));
    const res = await approvePost(ID);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/promises a result/);
    expect(r.setPostStatus).not.toHaveBeenCalled();
  });

  it("says so when the post was changed by something else in the meantime", async () => {
    r.setPostStatus.mockResolvedValue(false);
    expect((await approvePost(ID)).ok).toBe(false);
  });

  it("rejects a post from any unpublished state", async () => {
    expect(await rejectPost(ID)).toEqual({ ok: true });
    expect(r.setPostStatus).toHaveBeenCalledWith(ID, "rejected", ["draft", "approved", "failed"]);
  });

  it("saves an edited caption only if the post still passes the rules", async () => {
    expect(await saveCaption(ID, "New caption. Link in bio.")).toEqual({ ok: true });
    expect(r.updateCaption).toHaveBeenCalledWith(ID, "New caption. Link in bio.");
    const bad = await saveCaption(ID, "See https://evil.example");
    expect(bad.ok).toBe(false);
    expect(r.updateCaption).toHaveBeenCalledTimes(1);
  });

  it("approves every valid draft at once and reports the ones it skipped", async () => {
    r.listPosts.mockResolvedValue([
      post(),
      post({ id: "bbbbbbbb-2222-3333-4444-555555555555", caption: "We guarantee it." }),
      post({ id: "cccccccc-2222-3333-4444-555555555555", status: "published" }),
    ]);
    const res = await approveAll();
    expect(res).toEqual({ ok: true, approved: 1, skipped: 1 });
    expect(r.setPostStatus).toHaveBeenCalledTimes(1);
  });

  it("reports which accounts the connection reaches", async () => {
    m.metaConnected.mockReturnValue(true);
    m.metaAccounts.mockResolvedValue({ pageId: "1", pageName: "PiSpark", igUserId: "2" });
    expect(await testConnection()).toEqual({ ok: true, message: "Connected to the Facebook Page “PiSpark” and its Instagram account." });
    m.metaAccounts.mockResolvedValue({ pageId: "1", pageName: "PiSpark", igUserId: null });
    expect((await testConnection()).message).toMatch(/no Instagram account is linked/);
    m.metaAccounts.mockRejectedValue(new Error("Session has expired"));
    expect(await testConnection()).toEqual({ ok: false, message: "Meta refused the connection: Session has expired" });
    m.metaConnected.mockReturnValue(false);
    expect((await testConnection()).ok).toBe(false);
  });
});
