import "server-only";
import { generateSlots } from "@/lib/booking/slots";
import type { SendArgs } from "@/lib/email/send";
import { confirmationEmail, instantReplyEmail, ownerLeadEmail } from "@/lib/email/templates";
import {
  DuplicateLeadError,
  bookedSlots,
  countRecentByIp,
  createLead,
  findOpenByEmail,
} from "@/lib/leads/repo";
import { captureInputSchema, type Lead } from "@/lib/leads/schema";
import { familyLinks, siteUrl } from "./links";
import { noteEmailErrors, sendAll } from "./mail";
import { suggestSlots } from "./suggest";
import { leadToken, tokenSecret } from "./token";

export type CaptureResult =
  | {
      ok: true;
      /**
       * Lets this browser go straight on to pick a time. Only ever given for a
       * lead created by this very request: a returning family gets their link
       * by email, never on screen, so knowing an email is not enough to reach it.
       */
      token: string;
      existing: boolean;
    }
  | { ok: false; status: 400; issues: { path: string; message: string }[] }
  | { ok: false; status: 429 };

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Above this many sign-ups an hour from one address, save but do not email. */
const SOFT_LIMIT = 5;
/** Above this many, refuse: that is a flood, not a school's shared Wi-Fi. */
const HARD_LIMIT = 30;
const REUSE_DAYS = 30;

async function suggestedFor(lead: Lead, now: Date): Promise<string[]> {
  try {
    return suggestSlots(generateSlots(now, await bookedSlots(now)), lead.timezone);
  } catch (e) {
    // The reply still goes out, with the link to the times page.
    console.error("Could not load times for the reply", e);
    return [];
  }
}

/** Email the family the way back to their lead. */
async function sendFamilyLink(lead: Lead, now: Date): Promise<void> {
  const family = { to: lead.email, cc: lead.parentEmail };
  let message: SendArgs;
  if (lead.slot) {
    const { pickUrl } = familyLinks(lead);
    message = { ...family, ...confirmationEmail(lead, process.env.TRIAL_CALL_URL ?? "", pickUrl) };
  } else {
    const links = familyLinks(lead, await suggestedFor(lead, now));
    message = { ...family, ...instantReplyEmail(lead, links), unsubscribeUrl: links.unsubscribeUrl };
  }
  const { errors } = await sendAll([message]);
  await noteEmailErrors(lead.id, errors);
}

/**
 * Step one of the funnel. Saves the lead from a first name and an email, replies
 * at once with times to pick from, and alerts the owner. It is built to save the
 * lead even when something around it is broken.
 */
export async function captureLead(
  raw: unknown,
  ctx: { ip: string | null; now: Date },
): Promise<CaptureResult> {
  const honeypot = (raw as { website?: unknown } | null)?.website;
  const tripped = typeof honeypot === "string" && honeypot !== "";

  const parsed = captureInputSchema.safeParse(
    tripped ? { ...(raw as object), website: "" } : raw,
  );
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  }
  const input = parsed.data;

  let recent = 0;
  if (ctx.ip) {
    try {
      recent = await countRecentByIp(ctx.ip, new Date(ctx.now.getTime() - HOUR));
    } catch (e) {
      console.error("Rate-limit check failed; continuing", e);
    }
  }
  if (recent >= HARD_LIMIT) return { ok: false, status: 429 };

  // A sign-up that looks automated is still saved, flagged and without emails,
  // so a real person caught by autofill or shared Wi-Fi can be contacted by hand.
  const flagged = tripped ? "honeypot" : recent >= SOFT_LIMIT ? "rate_limited" : undefined;
  if (flagged) {
    console.warn("Sign-up saved without emails", { reason: flagged, email: input.email, ip: ctx.ip });
    await createLead(input, ctx.ip, flagged);
    return { ok: true, token: "", existing: false };
  }

  let open: Lead | null = null;
  try {
    open = await findOpenByEmail(input.email, new Date(ctx.now.getTime() - REUSE_DAYS * DAY));
  } catch (e) {
    console.error("Returning-family check failed; continuing", e);
  }
  if (open) {
    try {
      await sendFamilyLink(open, ctx.now);
    } catch (e) {
      await noteEmailErrors(open.id, [e instanceof Error ? e.message : String(e)]);
    }
    return { ok: true, token: "", existing: true };
  }

  let lead: Lead;
  try {
    lead = await createLead(input, ctx.ip, undefined);
  } catch (e) {
    // Two tabs at once: the other request created the lead and is emailing it.
    if (e instanceof DuplicateLeadError) return { ok: true, token: "", existing: true };
    throw e;
  }

  const outgoing: SendArgs[] = [];
  const problems: string[] = [];
  let token = "";
  try {
    const links = familyLinks(lead, await suggestedFor(lead, ctx.now));
    token = leadToken(lead.id, tokenSecret());
    outgoing.push({
      to: lead.email,
      cc: lead.parentEmail,
      ...instantReplyEmail(lead, links),
      unsubscribeUrl: links.unsubscribeUrl,
    });
  } catch (e) {
    problems.push(
      `The family was NOT emailed, write to them yourself: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (process.env.OWNER_EMAIL) {
    outgoing.push({ to: process.env.OWNER_EMAIL, ...ownerLeadEmail(lead, siteUrl()) });
  } else {
    console.error("OWNER_EMAIL is not set: the owner was not alerted about a new lead", { leadId: lead.id });
  }
  const { errors } = await sendAll(outgoing);
  await noteEmailErrors(lead.id, [...problems, ...errors]);

  return { ok: true, token, existing: false };
}
