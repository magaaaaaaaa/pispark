import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Stage } from "@/lib/config";
import type { CaptureInput, Lead, LeadDetails } from "./schema";

/** The family already has an open, unbooked lead (enforced by a unique index). */
export class DuplicateLeadError extends Error {
  constructor() {
    super("This email already has an open lead");
    this.name = "DuplicateLeadError";
  }
}

export class SlotTakenError extends Error {
  constructor() {
    super("That trial slot is already booked");
    this.name = "SlotTakenError";
  }
}

const FREED = "(lost,not_now)";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function client(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Database is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
const opt = <T>(v: unknown) => (v === null || v === undefined ? undefined : (v as T));

function toLead(r: Row): Lead {
  return {
    id: r.id as string,
    stage: r.stage as Stage,
    role: (r.role as Lead["role"] | null) ?? "parent",
    contactName: r.contact_name as string,
    studentName: opt<string>(r.student_name),
    email: r.email as string,
    parentEmail: opt<string>(r.parent_email),
    grade: opt<Lead["grade"]>(r.grade),
    testDate: opt<string>(r.test_date),
    currentScore: opt<number>(r.current_score),
    targetScore: opt<number>(r.target_score),
    timezone: r.timezone as string,
    slot: iso(r.trial_at),
    message: opt<string>(r.message),
    source: {
      utmSource: opt<string>(r.utm_source),
      utmMedium: opt<string>(r.utm_medium),
      utmCampaign: opt<string>(r.utm_campaign),
      utmContent: opt<string>(r.utm_content),
    },
    ownerNotes: (r.owner_notes as string | null) ?? null,
    emailError: (r.email_error as string | null) ?? null,
    reminderIds: (r.reminder_ids as string[] | null) ?? [],
    followupsSent: (r.followups_sent as number | null) ?? 0,
    unsubscribedAt: iso(r.unsubscribed_at),
    flagged: (r.flagged as string | null) ?? null,
    createdAt: iso(r.created_at) as string,
  };
}

function fail(error: { message?: string } | null | undefined): void {
  if (error) throw new Error(error.message ?? "Database error");
}

export async function createLead(
  input: CaptureInput,
  ip: string | null,
  flagged?: string,
): Promise<Lead> {
  const { data, error } = await client()
    .from("leads")
    .insert({
      stage: "new",
      role: input.role,
      contact_name: input.firstName,
      email: input.email,
      parent_email: input.parentEmail ?? null,
      timezone: input.timezone,
      utm_source: input.source.utmSource ?? null,
      utm_medium: input.source.utmMedium ?? null,
      utm_campaign: input.source.utmCampaign ?? null,
      utm_content: input.source.utmContent ?? null,
      ip,
      flagged: flagged ?? null,
    })
    .select()
    .single();
  if (error?.code === "23505") throw new DuplicateLeadError();
  fail(error);
  return toLead(data as Row);
}

/** Book (or move) the lead's trial. Throws SlotTakenError if another lead holds the slot. */
export async function setTrial(id: string, slot: string): Promise<Lead> {
  if (!UUID.test(id)) throw new Error("Unknown lead");
  const { data, error } = await client()
    .from("leads")
    .update({ trial_at: iso(slot), stage: "trial_booked" })
    .eq("id", id)
    .select()
    .single();
  if (error?.code === "23505") throw new SlotTakenError();
  fail(error);
  return toLead(data as Row);
}

export async function getLead(id: string): Promise<Lead | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await client().from("leads").select("*").eq("id", id).maybeSingle();
  fail(error);
  return data ? toLead(data as Row) : null;
}

export async function listLeads(): Promise<Lead[]> {
  const { data, error } = await client()
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  fail(error);
  return ((data as Row[] | null) ?? []).map(toLead);
}

/** The family's most recent lead that is still in play, so a second sign-up reuses it. */
export async function findOpenByEmail(email: string, since: Date): Promise<Lead | null> {
  const { data, error } = await client()
    .from("leads")
    .select("*")
    .eq("email", email)
    .gte("created_at", since.toISOString())
    .in("stage", ["new", "trial_booked"])
    .order("created_at", { ascending: false })
    .limit(1);
  fail(error);
  const rows = (data as Row[] | null) ?? [];
  return rows.length ? toLead(rows[0]) : null;
}

export async function bookedSlots(from: Date): Promise<string[]> {
  const { data, error } = await client()
    .from("leads")
    .select("trial_at")
    .gte("trial_at", from.toISOString())
    .not("stage", "in", FREED);
  fail(error);
  return ((data as Row[] | null) ?? []).map((r) => iso(r.trial_at) as string);
}

export async function countRecentByIp(ip: string, since: Date): Promise<number> {
  const { count, error } = await client()
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since.toISOString());
  fail(error);
  return count ?? 0;
}

async function patch(id: string, values: Row): Promise<void> {
  if (!UUID.test(id)) throw new Error("Unknown lead");
  const { error } = await client().from("leads").update(values).eq("id", id);
  if (error?.code === "23505") throw new SlotTakenError();
  fail(error);
}

export const updateStage = (id: string, stage: Stage) => patch(id, { stage });
export const saveOwnerNotes = (id: string, notes: string) => patch(id, { owner_notes: notes });
export const recordEmailError = (id: string, message: string) =>
  patch(id, { email_error: message.slice(0, 500) });
export const saveReminderIds = (id: string, ids: string[]) => patch(id, { reminder_ids: ids });

export async function countRecentLoginFailures(ip: string, since: Date): Promise<number> {
  const { count, error } = await client()
    .from("owner_login_failures")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since.toISOString());
  fail(error);
  return count ?? 0;
}

export async function recordLoginFailure(ip: string): Promise<void> {
  const { error } = await client().from("owner_login_failures").insert({ ip });
  fail(error);
}

/** Leads that may still be owed a follow-up nudge. */
export async function listNewLeads(): Promise<Lead[]> {
  const { data, error } = await client()
    .from("leads")
    .select("*")
    .eq("stage", "new")
    .is("unsubscribed_at", null)
    .is("flagged", null)
    .lt("followups_sent", 5)
    .order("created_at", { ascending: true })
    .limit(500);
  fail(error);
  return ((data as Row[] | null) ?? []).map(toLead);
}

/**
 * Mark nudge number `n` (0-based) as going out. Returns false if the lead is no
 * longer waiting for exactly that nudge — it booked, unsubscribed, or another
 * run got there first — in which case nothing must be sent.
 */
export async function claimFollowUp(id: string, n: number): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const { data, error } = await client()
    .from("leads")
    .update({ followups_sent: n + 1 })
    .eq("id", id)
    .eq("stage", "new")
    .eq("followups_sent", n)
    .is("unsubscribed_at", null)
    .select("id");
  fail(error);
  return ((data as Row[] | null) ?? []).length === 1;
}

export const markUnsubscribed = (id: string) =>
  patch(id, { unsubscribed_at: new Date().toISOString() });

/** Store the optional extras. Fields left out are not touched. */
export async function saveDetails(id: string, d: LeadDetails): Promise<void> {
  const values: Row = {};
  if (d.studentName !== undefined) values.student_name = d.studentName;
  if (d.grade !== undefined) values.grade = d.grade;
  if (d.testDate !== undefined) values.test_date = d.testDate;
  if (d.currentScore !== undefined) values.current_score = d.currentScore;
  if (d.targetScore !== undefined) values.target_score = d.targetScore;
  if (d.message !== undefined) values.message = d.message;
  if (Object.keys(values).length) await patch(id, values);
}
