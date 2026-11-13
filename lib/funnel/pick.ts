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
  saveFollowupIds,
  saveReminderIds,
  setTrial,
} from "@/lib/leads/repo";
import { detailsInputSchema, type Lead } from "@/lib/leads/schema";
import { familyLinks, noteEmailErrors, sendAll } from "./capture";
import { readLeadToken, tokenSecret } from "./token";

export type PickResult =
  | { ok: true; slot: string }
  | { ok: false; status: 400 | 404; message: string }
  | { ok: false; status: 409; slots: string[] };

const HOUR = 3_600_000;
const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "https://pispark.site";

/** Reminder send times that are still in the future. */
export function reminderTimes(slot: string, now: Date): { kind: "day" | "hour"; at: Date }[] {
  const start = new Date(slot).getTime();
  const all = [
    { kind: "day" as const, at: new Date(start - 24 * HOUR) },
    { kind: "hour" as const, at: new Date(start - HOUR) },
  ];
  return all.filter((r) => r.at.getTime() > now.getTime());
}

/** Cancel scheduled emails; ones that already went out or cannot be cancelled are ignored. */
async function cancelAll(ids: string[]): Promise<void> {
  await Promise.allSettled(ids.map((id) => cancelEmail(id)));
}

async function leadFromToken(token: unknown): Promise<Lead | null> {
  const id = readLeadToken(typeof token === "string" ? token : null, tokenSecret());
  return id ? getLead(id) : null;
}

/**
 * Step two of the funnel: the family picks (or moves) their trial time from a
 * link we sent them.
 */
export async function pickSlot(raw: unknown, now: Date): Promise<PickResult> {
  const { token, slot } = (raw ?? {}) as { token?: unknown; slot?: unknown };
  const lead = await leadFromToken(token);
  if (!lead) {
    return { ok: false, status: 404, message: "This link is not valid. Ask us for a new one." };
  }
  if (lead.stage !== "new" && lead.stage !== "trial_booked") {
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
  if (lead.slot === chosen) return { ok: true, slot: chosen };

  let booked: Lead;
  try {
    booked = await setTrial(lead.id, chosen);
  } catch (e) {
    if (e instanceof SlotTakenError) {
      return { ok: false, status: 409, slots: generateSlots(now, await bookedSlots(now)) };
    }
    throw e;
  }

  // Anything scheduled for the old state is now wrong: nudges to book, and
  // reminders for a previous time.
  await cancelAll([...lead.followupIds, ...lead.reminderIds]);
  if (lead.followupIds.length) {
    try {
      await saveFollowupIds(lead.id, []);
    } catch (e) {
      console.error("Could not clear follow-up ids", e);
    }
  }

  const callUrl = process.env.TRIAL_CALL_URL ?? "";
  const { pickUrl } = familyLinks(booked, []);
  const family = { to: booked.email, cc: booked.parentEmail };
  const ics = buildIcs(booked, callUrl);

  const outgoing: SendArgs[] = [{ ...family, ...confirmationEmail(booked, callUrl, pickUrl), ics }];
  if (process.env.OWNER_EMAIL) {
    outgoing.push({ to: process.env.OWNER_EMAIL, ...ownerBookedEmail(booked, siteUrl()), ics });
  }
  for (const r of reminderTimes(chosen, now)) {
    outgoing.push({ ...family, ...reminderEmail(booked, callUrl, r.kind, pickUrl), scheduledAt: r.at });
  }

  const { ids, errors } = await sendAll(outgoing);
  const reminderIds = ids.filter((id, i): id is string => id !== null && !!outgoing[i].scheduledAt);
  try {
    await saveReminderIds(booked.id, reminderIds);
  } catch (e) {
    console.error("Could not store reminder ids", e);
  }
  await noteEmailErrors(booked.id, errors);

  return { ok: true, slot: chosen };
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
  await cancelAll(lead.followupIds);
  await markUnsubscribed(lead.id);
  try {
    await saveFollowupIds(lead.id, []);
  } catch (e) {
    console.error("Could not clear follow-up ids", e);
  }
  return true;
}
