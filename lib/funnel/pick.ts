import "server-only";
import { generateSlots, isValidSlot } from "@/lib/booking/slots";
import { buildIcs } from "@/lib/email/ics";
import { cancelEmail, type SendArgs } from "@/lib/email/send";
import { confirmationEmail, ownerBookedEmail, reminderEmail } from "@/lib/email/templates";
import {
  SlotTakenError,
  bookedSlots,
  getLead,
  markUnsubscribed,
  saveDetails,
  saveReminderIds,
  setTrial,
} from "@/lib/leads/repo";
import { detailsInputSchema, type Lead } from "@/lib/leads/schema";
import { familyLinks, siteUrl } from "./links";
import { noteEmailErrors, sendAll } from "./mail";
import { readLeadToken, tokenSecret } from "./token";

/** Work that can happen after the family has their answer. */
export interface BookingFollowThrough {
  lead: Lead;
  /** Reminders scheduled for a previous time, now wrong. */
  cancelIds: string[];
}

export type PickResult =
  | { ok: true; slot: string; finish?: BookingFollowThrough }
  | { ok: false; status: 400 | 404; message: string }
  | { ok: false; status: 409; slots: string[] };

const HOUR = 3_600_000;
/** Stages from which a family may still book or move a trial through their link. */
const BOOKABLE = new Set(["new", "trial_booked", "not_now", "lost"]);

/** Reminder send times that are still in the future. */
export function reminderTimes(slot: string, now: Date): { kind: "day" | "hour"; at: Date }[] {
  const start = new Date(slot).getTime();
  const all = [
    { kind: "day" as const, at: new Date(start - 24 * HOUR) },
    { kind: "hour" as const, at: new Date(start - HOUR) },
  ];
  return all.filter((r) => r.at.getTime() > now.getTime());
}

async function leadFromToken(token: unknown): Promise<Lead | null> {
  const id = readLeadToken(typeof token === "string" ? token : null, tokenSecret());
  return id ? getLead(id) : null;
}

/**
 * Step two of the funnel: the family picks (or moves) their trial time from a
 * link we sent them. Confirms to the family and alerts the owner before
 * answering; reminders are left to finishBooking.
 */
export async function pickSlot(raw: unknown, now: Date): Promise<PickResult> {
  const { token, slot } = (raw ?? {}) as { token?: unknown; slot?: unknown };
  const lead = await leadFromToken(token);
  if (!lead) {
    return { ok: false, status: 404, message: "This link is not valid. Ask us for a new one." };
  }
  if (!BOOKABLE.has(lead.stage)) {
    return {
      ok: false,
      status: 400,
      message: "This trial has already taken place. Reply to any of our emails to arrange lessons.",
    };
  }
  if (typeof slot !== "string" || !isValidSlot(slot, now)) {
    return { ok: false, status: 400, message: "That time is no longer available. Please pick another." };
  }
  const chosen = new Date(slot).toISOString();
  if (lead.slot === chosen && lead.stage === "trial_booked") return { ok: true, slot: chosen };

  let booked: Lead;
  try {
    booked = await setTrial(lead.id, chosen);
  } catch (e) {
    if (e instanceof SlotTakenError) {
      return { ok: false, status: 409, slots: generateSlots(now, await bookedSlots(now)) };
    }
    throw e;
  }

  const callUrl = process.env.TRIAL_CALL_URL ?? "";
  const outgoing: SendArgs[] = [];
  const problems: string[] = [];
  try {
    const ics = buildIcs(booked, callUrl);
    const { pickUrl } = familyLinks(booked);
    outgoing.push({
      to: booked.email,
      cc: booked.parentEmail,
      ...confirmationEmail(booked, callUrl, pickUrl),
      ics,
    });
    if (process.env.OWNER_EMAIL) {
      outgoing.push({ to: process.env.OWNER_EMAIL, ...ownerBookedEmail(booked, siteUrl()), ics });
    } else {
      console.error("OWNER_EMAIL is not set: the owner was not told about a booking", { leadId: booked.id });
    }
  } catch (e) {
    problems.push(`Confirmation was not sent: ${e instanceof Error ? e.message : String(e)}`);
  }
  const { errors } = await sendAll(outgoing);
  await noteEmailErrors(booked.id, [...problems, ...errors]);

  return { ok: true, slot: chosen, finish: { lead: booked, cancelIds: lead.reminderIds } };
}

/**
 * After the answer: withdraw reminders for the old time and schedule the new
 * ones. Anything that fails is written on the lead so the owner can step in.
 */
export async function finishBooking(work: BookingFollowThrough, now: Date): Promise<void> {
  const { lead, cancelIds } = work;
  if (!lead.slot) return;
  const problems: string[] = [];

  const cancelled = await Promise.allSettled(cancelIds.map((id) => cancelEmail(id)));
  const stuck = cancelIds.filter((_, i) => cancelled[i].status === "rejected");
  if (stuck.length) {
    problems.push(
      `A reminder for the family's OLD time could not be cancelled (${stuck.join(", ")}). Tell them to ignore it.`,
    );
  }

  const callUrl = process.env.TRIAL_CALL_URL ?? "";
  let reminderIds: string[] = [];
  try {
    const { pickUrl } = familyLinks(lead);
    const family = { to: lead.email, cc: lead.parentEmail };
    const messages: SendArgs[] = reminderTimes(lead.slot, now).map((r) => ({
      ...family,
      ...reminderEmail(lead, callUrl, r.kind, pickUrl),
      scheduledAt: r.at,
    }));
    const { ids, errors } = await sendAll(messages);
    reminderIds = ids.filter((id): id is string => id !== null);
    problems.push(...errors);
  } catch (e) {
    problems.push(`Reminders were not scheduled: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    await saveReminderIds(lead.id, reminderIds);
  } catch (e) {
    console.error("Could not store reminder ids", { leadId: lead.id, error: e });
  }
  await noteEmailErrors(lead.id, problems);
}

export type DetailsResult =
  | { ok: true }
  | { ok: false; status: 404 }
  | { ok: false; status: 400; issues: { path: string; message: string }[] };

/** Optional extras, offered after a time is picked. */
export async function saveLeadDetails(raw: unknown): Promise<DetailsResult> {
  const { token, ...rest } = (raw ?? {}) as { token?: unknown };
  const id = readLeadToken(typeof token === "string" ? token : null, tokenSecret());
  if (!id) return { ok: false, status: 404 };
  const parsed = detailsInputSchema.safeParse(rest);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  }
  await saveDetails(id, parsed.data);
  return { ok: true };
}

/** Stop the nudges for the lead behind an unsubscribe link. */
export async function unsubscribeLead(token: unknown): Promise<boolean> {
  const lead = await leadFromToken(token);
  if (!lead) return false;
  await markUnsubscribed(lead.id);
  return true;
}
