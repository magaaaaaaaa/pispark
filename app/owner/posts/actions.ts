"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerPage } from "@/lib/admin/guard";
import { metaAccounts, metaConnected } from "@/lib/content/meta";
import { getPost, listPosts, setPostStatus, updateCaption } from "@/lib/content/repo";
import { checkPost } from "@/lib/content/schema";

export type PostActionResult = { ok: true } | { ok: false; error: string };

const GONE = "This post was changed in the meantime. Reload the page.";

export async function approvePost(id: string): Promise<PostActionResult> {
  await requireOwnerPage();
  const post = await getPost(id);
  if (!post) return { ok: false, error: "This post no longer exists." };
  const checked = checkPost(post);
  if (!checked.ok) return { ok: false, error: `Cannot approve: ${checked.problems.join(" ")}` };
  // "failed" is included so the same button serves as "Try again".
  if (!(await setPostStatus(id, "approved", ["draft", "failed"]))) return { ok: false, error: GONE };
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
  if (!(await updateCaption(id, checked.content.caption))) return { ok: false, error: GONE };
  revalidatePath("/owner/posts");
  return { ok: true };
}

export async function approveAll(): Promise<{ ok: true; approved: number; skipped: number }> {
  await requireOwnerPage();
  let approved = 0;
  let skipped = 0;
  for (const post of await listPosts()) {
    if (post.status !== "draft") continue;
    if (checkPost(post).ok && (await setPostStatus(post.id, "approved", ["draft", "failed"]))) approved++;
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
