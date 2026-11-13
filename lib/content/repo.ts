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
  return ((data as Row[] | null) ?? []).map(toPost);
}

export async function getPost(id: string): Promise<Post | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await client().from("posts").select("*").eq("id", id).maybeSingle();
  fail(error);
  return data ? toPost(data as Row) : null;
}

/** Change status, but only from one of the states it is allowed to leave. */
export async function setPostStatus(
  id: string,
  status: PostStatus,
  from: PostStatus[],
): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const { data, error } = await client()
    .from("posts")
    .update({ status, publish_error: null })
    .eq("id", id)
    .in("status", from)
    .select("id");
  fail(error);
  return ((data as Row[] | null) ?? []).length === 1;
}

export async function updateCaption(id: string, caption: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const { data, error } = await client()
    .from("posts")
    .update({ caption })
    .eq("id", id)
    .in("status", ["draft", "approved", "failed"])
    .select("id");
  fail(error);
  return ((data as Row[] | null) ?? []).length === 1;
}

/**
 * Take the oldest approved post that is due, marking it "publishing" so that a
 * second run cannot publish it as well. Returns null when nothing is due.
 */
export async function claimNextApproved(today: string): Promise<Post | null> {
  const db = client();
  const { data: due, error } = await db
    .from("posts")
    .select("id")
    .eq("status", "approved")
    .lte("scheduled_for", today)
    .order("scheduled_for", { ascending: true })
    .limit(1);
  fail(error);
  const id = ((due as Row[] | null) ?? [])[0]?.id as string | undefined;
  if (!id) return null;
  const { data, error: claimError } = await db
    .from("posts")
    .update({ status: "publishing" })
    .eq("id", id)
    .eq("status", "approved")
    .select("*");
  fail(claimError);
  const rows = (data as Row[] | null) ?? [];
  return rows.length ? toPost(rows[0]) : null;
}

export async function markPublished(
  id: string,
  result: { igMediaId: string | null; fbPostId: string | null; error: string | null },
): Promise<void> {
  const { error } = await client()
    .from("posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      ig_media_id: result.igMediaId,
      fb_post_id: result.fbPostId,
      publish_error: result.error,
    })
    .eq("id", id);
  fail(error);
}

export async function markFailed(id: string, message: string): Promise<void> {
  const { error } = await client()
    .from("posts")
    .update({ status: "failed", publish_error: message.slice(0, 1000) })
    .eq("id", id);
  fail(error);
}

export async function listUnnotifiedDrafts(): Promise<Post[]> {
  const { data, error } = await client()
    .from("posts")
    .select("*")
    .eq("status", "draft")
    .is("owner_notified_at", null)
    .order("scheduled_for", { ascending: true })
    .limit(30);
  fail(error);
  return ((data as Row[] | null) ?? []).map(toPost);
}

export async function markNotified(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await client()
    .from("posts")
    .update({ owner_notified_at: new Date().toISOString() })
    .in("id", ids.filter((i) => UUID.test(i)));
  fail(error);
}
