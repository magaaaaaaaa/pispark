import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Post, PostStatus, Slide } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Row = Record<string, unknown>;

function client(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Database is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function fail(error: { message?: string } | null | undefined): void {
  if (error) throw new Error(error.message ?? "Database error");
}

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
const rows = (data: unknown) => (data as Row[] | null) ?? [];

function toPost(r: Row): Post {
  return {
    id: r.id as string,
    scheduledFor: String(r.scheduled_for).slice(0, 10),
    kind: r.kind as Post["kind"],
    topic: (r.topic as string) ?? "",
    caption: (r.caption as string) ?? "",
    slides: (r.slides as Slide[]) ?? [],
    status: r.status as PostStatus,
    checkNote: (r.check_note as string | null) ?? null,
    approvedHash: (r.approved_hash as string | null) ?? null,
    publishError: (r.publish_error as string | null) ?? null,
    igMediaId: (r.ig_media_id as string | null) ?? null,
    fbPostId: (r.fb_post_id as string | null) ?? null,
    publishedAt: iso(r.published_at),
    createdAt: iso(r.created_at) as string,
  };
}

export async function listPosts(): Promise<Post[]> {
  const { data, error } = await client()
    .from("posts")
    .select("*")
    .order("scheduled_for", { ascending: false })
    .limit(60);
  fail(error);
  return rows(data).map(toPost);
}

export async function getPost(id: string): Promise<Post | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await client().from("posts").select("*").eq("id", id).maybeSingle();
  fail(error);
  return data ? toPost(data as Row) : null;
}

/**
 * Approve a post: record the fingerprint of what was approved and, if its day
 * has already passed, move it to `day` so it goes out on the next run.
 */
export async function approve(id: string, hash: string, day: string | null): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const values: Row = { status: "approved", approved_hash: hash, publish_error: null, claimed_at: null };
  if (day) values.scheduled_for = day;
  const { data, error } = await client()
    .from("posts")
    .update(values)
    .eq("id", id)
    .in("status", ["draft", "failed"])
    .select("id");
  fail(error);
  return rows(data).length === 1;
}

/** Change status, but only from one of the states it is allowed to leave. */
export async function setPostStatus(
  id: string,
  status: Exclude<PostStatus, "approved">,
  from: PostStatus[],
): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const { data, error } = await client()
    .from("posts")
    .update({ status, approved_hash: null })
    .eq("id", id)
    .in("status", from)
    .select("id");
  fail(error);
  return rows(data).length === 1;
}

/** Save an edited caption. `hash` re-binds an existing approval to the new text. */
export async function updateCaption(id: string, caption: string, hash: string | null): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const { data, error } = await client()
    .from("posts")
    .update(hash ? { caption, approved_hash: hash } : { caption })
    .eq("id", id)
    .in("status", ["draft", "approved", "failed"])
    .select("id");
  fail(error);
  return rows(data).length === 1;
}

/** Posts left in "publishing" by a run that died. They become "failed" and are returned. */
export async function reclaimStale(claimedBefore: Date): Promise<Post[]> {
  const { data, error } = await client()
    .from("posts")
    .update({
      status: "failed",
      publish_error:
        "Publishing was interrupted, so this post may or may not have gone out. Check Instagram and Facebook before pressing Try again.",
    })
    .eq("status", "publishing")
    .lt("claimed_at", claimedBefore.toISOString())
    .select("*");
  fail(error);
  return rows(data).map(toPost);
}

/** Approved posts whose day passed without being published. They become "failed" and are returned. */
export async function expireMissed(beforeDay: string): Promise<Post[]> {
  const { data, error } = await client()
    .from("posts")
    .update({
      status: "failed",
      publish_error: "Its day passed before it could be published. Press Try again to send it out on the next run.",
    })
    .eq("status", "approved")
    .lt("scheduled_for", beforeDay)
    .select("*");
  fail(error);
  return rows(data).map(toPost);
}

/**
 * Take the oldest approved post scheduled between `fromDay` and `today`,
 * marking it "publishing" so that a second run cannot take it as well.
 */
export async function claimNextApproved(fromDay: string, today: string): Promise<Post | null> {
  const db = client();
  const { data: due, error } = await db
    .from("posts")
    .select("id")
    .eq("status", "approved")
    .gte("scheduled_for", fromDay)
    .lte("scheduled_for", today)
    .order("scheduled_for", { ascending: true })
    .limit(1);
  fail(error);
  const id = rows(due)[0]?.id as string | undefined;
  if (!id) return null;
  const { data, error: claimError } = await db
    .from("posts")
    .update({ status: "publishing", claimed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "approved")
    .select("*");
  fail(claimError);
  const claimed = rows(data);
  return claimed.length ? toPost(claimed[0]) : null;
}

/** Record that one network has the post. Written at once, so a retry never posts there again. */
export async function saveNetworkId(id: string, network: "ig" | "fb", value: string): Promise<void> {
  const { error } = await client()
    .from("posts")
    .update(network === "ig" ? { ig_media_id: value } : { fb_post_id: value })
    .eq("id", id);
  fail(error);
}

export async function markPublished(id: string, note: string | null): Promise<void> {
  const { error } = await client()
    .from("posts")
    .update({ status: "published", published_at: new Date().toISOString(), publish_error: note })
    .eq("id", id)
    .eq("status", "publishing");
  fail(error);
}

export async function markFailed(id: string, message: string): Promise<void> {
  const { error } = await client()
    .from("posts")
    .update({ status: "failed", publish_error: message.slice(0, 1000) })
    .eq("id", id)
    .eq("status", "publishing");
  fail(error);
}

/** Withdraw an approval that no longer covers the post. */
export async function sendBackToDraft(id: string, message: string): Promise<void> {
  const { error } = await client()
    .from("posts")
    .update({ status: "draft", approved_hash: null, publish_error: message.slice(0, 1000) })
    .eq("id", id)
    .eq("status", "publishing");
  fail(error);
}

async function countWhere(status: PostStatus, day: string): Promise<number> {
  const { count, error } = await client()
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("status", status)
    .eq("scheduled_for", day);
  fail(error);
  return count ?? 0;
}
export const countDrafts = (day: string) => countWhere("draft", day);
export const countApproved = (day: string) => countWhere("approved", day);

export async function listUnnotifiedDrafts(): Promise<Post[]> {
  const { data, error } = await client()
    .from("posts")
    .select("*")
    .eq("status", "draft")
    .is("owner_notified_at", null)
    .order("scheduled_for", { ascending: true })
    .limit(30);
  fail(error);
  return rows(data).map(toPost);
}

export async function markNotified(ids: string[]): Promise<void> {
  const valid = ids.filter((i) => UUID.test(i));
  if (!valid.length) return;
  const { error } = await client()
    .from("posts")
    .update({ owner_notified_at: new Date().toISOString() })
    .in("id", valid);
  fail(error);
}
