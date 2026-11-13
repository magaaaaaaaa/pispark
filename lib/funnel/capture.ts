import "server-only";
import { generateSlots } from "@/lib/booking/slots";
import { cancelEmail, sendEmail, type SendArgs } from "@/lib/email/send";
import {
  FOLLOWUP_COUNT,
  followUpEmail,
  formatShort,
  instantReplyEmail,
  ownerLeadEmail,
  type FamilyLinks,
} from "@/lib/email/templates";
import {
  bookedSlots,
  countRecentByIp,
  createLead,
  findOpenByEmail,
  getLead,
  recordEmailError,
  saveFollowupIds,
} from "@/lib/leads/repo";
import { captureInputSchema, type Lead } from "@/lib/leads/schema";
import { suggestSlots } from "./suggest";
import { leadToken, tokenSecret } from "./token";

export type CaptureResult =
  | {
      ok: true;
      /** Goes into the "pick a time" link. Empty for a dropped bot. */
      token: string;
      existing: boolean;
      booked: boolean;
      /** Set only for a newly created lead, so the caller can schedule its follow-ups. */
      created?: Lead;
    }
  | { ok: false; status: 400; issues: { path: string; message: string }[] }
  | { ok: false; status: 429 };

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MAX_PER_IP_PER_HOUR = 5;
const REUSE_DAYS = 30;

/** Days after sign-up on which an unbooked lead gets a nudge. */
export const FOLLOWUP_DAYS = [1, 3, 6, 10, 14] as const;

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "https://pispark.site";

export function familyLinks(lead: Lead, suggested: string[]): FamilyLinks {
  const token = leadToken(lead.id, tokenSecret());
  const pickUrl = `${siteUrl()}/pick?l=${token}`;
  return {
    pickUrl,
    unsubscribeUrl: `${siteUrl()}/unsubscribe?l=${token}`,
    suggestions: suggested.map((s) => ({
      label: formatShort(s, lead.timezone),
      url: `${pickUrl}&slot=${encodeURIComponent(s)}`,
    })),
  };
}

/** Send in order, one at a time; collect failures instead of throwing. */
export async function sendAll(messages: SendArgs[]): Promise<{ ids: (string | null)[]; errors: string[] }> {
  const ids: (string | null)[] = [];
  const errors: string[] = [];
  for (const m of messages) {
    try {
      ids.push((await sendEmail(m)).id);
    } catch (e) {
      ids.push(null);
      errors.push(`${m.subject}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { ids, errors };
}

export async function noteEmailErrors(leadId: string, errors: string[]): Promise<void> {
  if (!errors.length) return;
  console.error("Emails failed", { leadId, errors });
  try {
    await recordEmailError(leadId, errors.join(" | "));
  } catch (e) {
    console.error("Could not record email failure", e);
  }
}

/**
 * Step one of the funnel. Saves the lead from a first name and an email, replies
 * at once with times to pick from, and alerts the owner. Never asks for a time.
 */
export async function captureLead(
  raw: unknown,
  ctx: { ip: string | null; now: Date },
): Promise<CaptureResult> {
  const honeypot = (raw as { website?: unknown } | null)?.website;
  if (typeof honeypot === "string" && honeypot !== "") {
    // Logged so that a real family caught by an over-eager autofill can be found.
    console.warn("Sign-up dropped by honeypot", {
      email: String((raw as { email?: unknown }).email ?? "").slice(0, 200),
      ip: ctx.ip,
    });
    return { ok: true, token: "", existing: false, booked: false };
  }

  const parsed = captureInputSchema.safeParse(raw);
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

  const open = await findOpenByEmail(input.email, new Date(ctx.now.getTime() - REUSE_DAYS * DAY));
  if (open) {
    return {
      ok: true,
      token: leadToken(open.id, tokenSecret()),
      existing: true,
      booked: open.slot !== null,
    };
  }

  const lead = await createLead(input, ctx.ip);

  let suggested: string[] = [];
  try {
    suggested = suggestSlots(generateSlots(ctx.now, await bookedSlots(ctx.now)), lead.timezone);
  } catch (e) {
    // The reply still goes out, with the link to the times page.
    console.error("Could not load times for the instant reply", e);
  }
  const links = familyLinks(lead, suggested);

  const outgoing: SendArgs[] = [
    { to: lead.email, cc: lead.parentEmail, ...instantReplyEmail(lead, links) },
  ];
  if (process.env.OWNER_EMAIL) {
    outgoing.push({ to: process.env.OWNER_EMAIL, ...ownerLeadEmail(lead, siteUrl()) });
  }
  const { errors } = await sendAll(outgoing);
  await noteEmailErrors(lead.id, errors);

  return {
    ok: true,
    token: leadToken(lead.id, tokenSecret()),
    existing: false,
    booked: false,
    created: lead,
  };
}

/**
 * Queue the nudges for a lead who has not picked a time. Runs after the sign-up
 * response has been sent, so it re-reads the lead and does nothing if they have
 * already booked or unsubscribed.
 */
export async function scheduleFollowUps(lead: Lead, now: Date): Promise<void> {
  const current = await getLead(lead.id);
  if (!current || current.stage !== "new" || current.unsubscribedAt) return;

  const links = familyLinks(current, []);
  const messages: SendArgs[] = FOLLOWUP_DAYS.slice(0, FOLLOWUP_COUNT).map((day, i) => ({
    to: current.email,
    cc: current.parentEmail,
    ...followUpEmail(current, i, links),
    scheduledAt: new Date(now.getTime() + day * DAY),
  }));
  const { ids, errors } = await sendAll(messages);
  const scheduled = ids.filter((id): id is string => id !== null);

  // Scheduling takes a few seconds. If the family booked or unsubscribed in that
  // time, their booking never saw these ids, so withdraw them here.
  const after = await getLead(current.id);
  if (!after || after.stage !== "new" || after.unsubscribedAt) {
    await Promise.allSettled(scheduled.map((id) => cancelEmail(id)));
    return;
  }

  if (scheduled.length) {
    try {
      await saveFollowupIds(current.id, scheduled);
    } catch (e) {
      console.error("Could not store follow-up ids", { leadId: current.id, error: e });
    }
  }
  await noteEmailErrors(current.id, errors);
}
