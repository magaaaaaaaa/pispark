import "server-only";
import { generateSlots, isValidSlot } from "@/lib/booking/slots";
import { buildIcs } from "@/lib/email/ics";
import { sendEmail, type SendArgs } from "@/lib/email/send";
import {
  confirmationEmail,
  ownerNotificationEmail,
  reminderEmail,
} from "@/lib/email/templates";
import {
  SlotTakenError,
  bookedSlots,
  countRecentByIp,
  createLead,
  findUpcomingByEmail,
  recordEmailError,
  saveReminderIds,
} from "@/lib/leads/repo";
import { leadInputSchema, type Lead } from "@/lib/leads/schema";

export type BookResult =
  | { ok: true; leadId: string; existing: boolean }
  | { ok: false; status: 400; issues: { path: string; message: string }[] }
  | { ok: false; status: 409; reason: "slot_taken"; slots: string[] }
  | { ok: false; status: 429 };

const HOUR = 3_600_000;
const MAX_PER_IP_PER_HOUR = 5;

/** Reminder send times that are still in the future. */
export function reminderTimes(slot: string, now: Date): { kind: "day" | "hour"; at: Date }[] {
  const start = new Date(slot).getTime();
  const all = [
    { kind: "day" as const, at: new Date(start - 24 * HOUR) },
    { kind: "hour" as const, at: new Date(start - HOUR) },
  ];
  return all.filter((r) => r.at.getTime() > now.getTime());
}

export async function bookTrial(
  raw: unknown,
  ctx: { ip: string | null; now: Date },
): Promise<BookResult> {
  // A bot that fills the hidden field gets a success it cannot learn from.
  const honeypot = (raw as { website?: unknown } | null)?.website;
  if (typeof honeypot === "string" && honeypot !== "") {
    // Logged so that a real family caught by an over-eager autofill can be found and contacted.
    console.warn("Booking dropped by honeypot", {
      email: String((raw as { email?: unknown }).email ?? "").slice(0, 200),
      ip: ctx.ip,
    });
    return { ok: true, leadId: "", existing: false };
  }

  const parsed = leadInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  }
  const input = parsed.data;

  if (ctx.ip) {
    const recent = await countRecentByIp(ctx.ip, new Date(ctx.now.getTime() - HOUR));
    if (recent >= MAX_PER_IP_PER_HOUR) return { ok: false, status: 429 };
  }

  const existing = await findUpcomingByEmail(input.email, ctx.now);
  if (existing) return { ok: true, leadId: existing.id, existing: true };

  if (input.slot !== null && !isValidSlot(input.slot, ctx.now)) {
    return {
      ok: false,
      status: 400,
      issues: [{ path: "slot", message: "That time is no longer available. Please pick another." }],
    };
  }

  let lead: Lead;
  try {
    lead = await createLead(input, ctx.ip);
  } catch (e) {
    if (e instanceof SlotTakenError) {
      const slots = generateSlots(ctx.now, await bookedSlots(ctx.now));
      return { ok: false, status: 409, reason: "slot_taken", slots };
    }
    throw e;
  }

  await sendBookingEmails(lead, ctx.now);
  return { ok: true, leadId: lead.id, existing: false };
}

/** The booking is already saved; an email failure is recorded, never thrown. */
async function sendBookingEmails(lead: Lead, now: Date): Promise<void> {
  const callUrl = process.env.TRIAL_CALL_URL ?? "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pispark.site";
  const family = { to: lead.email, cc: lead.parentEmail };

  const outgoing: SendArgs[] = [
    {
      ...family,
      ...confirmationEmail(lead, callUrl),
      ics: lead.slot ? buildIcs(lead, callUrl) : undefined,
    },
  ];
  if (process.env.OWNER_EMAIL) {
    outgoing.push({
      to: process.env.OWNER_EMAIL,
      ...ownerNotificationEmail(lead, siteUrl),
      ics: lead.slot ? buildIcs(lead, callUrl) : undefined,
    });
  }
  if (lead.slot) {
    for (const r of reminderTimes(lead.slot, now)) {
      outgoing.push({ ...family, ...reminderEmail(lead, callUrl, r.kind), scheduledAt: r.at });
    }
  }

  // One at a time, confirmation first: the email service limits requests per second,
  // and if anything is going to fail it should not be the confirmation.
  const errors: string[] = [];
  const reminderIds: string[] = [];
  for (const message of outgoing) {
    try {
      const { id } = await sendEmail(message);
      if (message.scheduledAt) reminderIds.push(id);
    } catch (e) {
      errors.push(`${message.subject}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (reminderIds.length) {
    try {
      await saveReminderIds(lead.id, reminderIds);
    } catch (e) {
      console.error("Could not store reminder ids", { leadId: lead.id, error: e });
    }
  }
  if (errors.length) {
    console.error("Booking emails failed", { leadId: lead.id, errors });
    try {
      await recordEmailError(lead.id, errors.join(" | "));
    } catch (e) {
      console.error("Could not record email failure", e);
    }
  }
}
