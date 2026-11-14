"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerPage } from "@/lib/admin/guard";
import { contentHash } from "@/lib/content/hash";
import { metaAccounts, metaConnected } from "@/lib/content/meta";
import { easternDate } from "@/lib/content/publish";
import { approve, getPost, listPosts, setPostStatus, updateCaption } from "@/lib/content/repo";
import { checkPost, type Post } from "@/lib/content/schema";

export type PostActionResult = { ok: true } | { ok: false; error: string };

const GONE = "This post was changed in the meantime. Reload the page.";

/** Why a post may not be approved, or null if it may. */
function blocker(post: Post): string | null {
  const checked = checkPost(post);
  if (!checked.ok) return `Cannot approve: ${checked.problems.join(" ")}`;
  if (!post.checkNote || post.checkNote.trim().length < 10) {
    return "Cannot approve: this post does not say how the answer was checked. Ask for it to be rewritten.";
  }
  return null;
}

/** Approve, binding the approval to the exact content and rescheduling a post whose day has passed. */
async function approveChecked(post: Post): Promise<boolean> {
  const checked = checkPost(post);
  if (!checked.ok) return false;
  const today = easternDate(new Date());
  return approve(post.id, contentHash(checked.content), post.scheduledFor < today ? today : null);
}

/** Approve a draft, or queue a failed post to be tried again. */
export async function approvePost(id: string): Promise<PostActionResult> {
  await requireOwnerPage();
  const post = await getPost(id);
  if (!post) return { ok: false, error: "This post no longer exists." };

  if (post.igMediaId && post.fbPostId) {
    // Both networks already have it; publishing again would duplicate it.
    await setPostStatus(id, "published", ["failed"]);
    revalidatePath("/owner/posts");
    return { ok: false, error: "This post is already on Instagram and Facebook, so it was not sent again. It is now marked as published." };
  }
  const why = blocker(post);
  if (why) return { ok: false, error: why };
  if (!(await approveChecked(post))) return { ok: false, error: GONE };
  revalidatePath("/owner/posts");
  return { ok: true };
}

export async function unapprovePost(id: string): Promise<PostActionResult> {
  await requireOwnerPage();
  if (!(await setPostStatus(id, "draft", ["approved"]))) return { ok: false, error: GONE };
  revalidatePath("/owner/posts");
  return { ok: true };
}

export async function rejectPost(id: string): Promise<PostActionResult> {
  await requireOwnerPage();
  if (!(await setPostStatus(id, "rejected", ["draft", "approved", "failed"]))) {
    return { ok: false, error: GONE };
  }
  revalidatePath("/owner/posts");
  return { ok: true };
}

export async function saveCaption(id: string, caption: string): Promise<PostActionResult> {
  await requireOwnerPage();
  const post = await getPost(id);
  if (!post) return { ok: false, error: "This post no longer exists." };
  const checked = checkPost({ ...post, caption });
  if (!checked.ok) return { ok: false, error: checked.problems.join(" ") };
  // The owner is the one editing, so an existing approval follows the new text.
  const hash = post.status === "approved" ? contentHash(checked.content) : null;
  if (!(await updateCaption(id, checked.content.caption, hash))) return { ok: false, error: GONE };
  revalidatePath("/owner/posts");
  return { ok: true };
}

export async function approveAll(): Promise<{ ok: true; approved: number; skipped: number }> {
  await requireOwnerPage();
  let approved = 0;
  let skipped = 0;
  for (const post of await listPosts()) {
    if (post.status !== "draft") continue;
    if (!blocker(post) && (await approveChecked(post))) approved++;
    else skipped++;
  }
  revalidatePath("/owner/posts");
  return { ok: true, approved, skipped };
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  await requireOwnerPage();
  if (!metaConnected()) {
    return { ok: false, message: "Not connected yet: META_PAGE_TOKEN is not set in Vercel." };
  }
  try {
    const a = await metaAccounts();
    return {
      ok: true,
      message: a.igUserId
        ? `Connected to the Facebook Page “${a.pageName}” and its Instagram account.`
        : `Connected to the Facebook Page “${a.pageName}”, but no Instagram account is linked to it. Link @pispark.math to the Page in Meta Business Suite.`,
    };
  } catch (e) {
    return { ok: false, message: `Meta refused the connection: ${e instanceof Error ? e.message : String(e)}` };
  }
}
