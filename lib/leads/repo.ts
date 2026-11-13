import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Stage } from "@/lib/config";
import type { Lead, LeadInput } from "./schema";

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
    role: r.role as Lead["role"],
    contactName: r.contact_name as string,
    studentName: r.student_name as string,
    email: r.email as string,
    parentEmail: opt<string>(r.parent_email),
    grade: r.grade as Lead["grade"],
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
    createdAt: iso(r.created_at) as string,
  };
}

function fail(error: { message?: string } | null | undefined): void {
  if (error) throw new Error(error.message ?? "Database error");
}

export async function createLead(input: LeadInput, ip: string | null): Promise<Lead> {
  const { data, error } = await client()
    .from("leads")
    .insert({
      stage: input.slot ? "trial_booked" : "new",
      role: input.role,
      contact_name: input.contactName,
      student_name: input.studentName,
      email: input.email,
      parent_email: input.parentEmail ?? null,
      grade: input.grade,
      test_date: input.testDate ?? null,
      current_score: input.currentScore ?? null,
      target_score: input.targetScore ?? null,
      timezone: input.timezone,
      trial_at: iso(input.slot),
      message: input.message ?? null,
      utm_source: input.source.utmSource ?? null,
      utm_medium: input.source.utmMedium ?? null,
      utm_campaign: input.source.utmCampaign ?? null,
      utm_content: input.source.utmContent ?? null,
      ip,
    })
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

export async function findUpcomingByEmail(email: string, now: Date): Promise<Lead | null> {
  const { data, error } = await client()
    .from("leads")
    .select("*")
    .eq("email", email)
    .gt("trial_at", now.toISOString())
    .not("stage", "in", FREED)
    .order("trial_at", { ascending: true })
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
