import "server-only";
import { sendEmail } from "@/lib/email/send";
import { FOLLOWUP_COUNT, followUpEmail } from "@/lib/email/templates";
import { claimFollowUp, listNewLeads } from "@/lib/leads/repo";
import type { Lead } from "@/lib/leads/schema";
import { familyLinks } from "./links";
import { noteEmailErrors } from "./mail";

/** Days after sign-up on which an unbooked lead gets a nudge. */
export const FOLLOWUP_DAYS = [1, 3, 6, 10, 14] as const;

const DAY = 86_400_000;

/**
 * Which nudge (0-based) this lead is owed right now, or null. Decided from the
 * lead's state at the moment of sending, so a lead who booked, unsubscribed or
 * was closed a minute ago gets nothing.
 */
export function dueFollowUp(lead: Lead, now: Date): number | null {
  if (lead.stage !== "new" || lead.unsubscribedAt || lead.flagged) return null;
  const n = lead.followupsSent;
  if (n >= FOLLOWUP_COUNT || n >= FOLLOWUP_DAYS.length) return null;
  const age = now.getTime() - new Date(lead.createdAt).getTime();
  return age >= FOLLOWUP_DAYS[n] * DAY ? n : null;
}

/** The daily job: send each waiting lead the one nudge it is owed, if any. */
export async function runFollowUps(
  now: Date,
): Promise<{ sent: number; failed: number; skipped: number }> {
  const tally = { sent: 0, failed: 0, skipped: 0 };
  for (const lead of await listNewLeads()) {
    const n = dueFollowUp(lead, now);
    if (n === null) {
      tally.skipped++;
      continue;
    }
    try {
      // Claim first: if this run dies mid-way, the nudge is skipped, never sent twice.
      if (!(await claimFollowUp(lead.id, n))) {
        tally.skipped++;
        continue;
      }
      const links = familyLinks(lead);
      await sendEmail({
        to: lead.email,
        cc: lead.parentEmail,
        ...followUpEmail(lead, n, links),
        unsubscribeUrl: links.unsubscribeUrl,
      });
      tally.sent++;
    } catch (e) {
      tally.failed++;
      await noteEmailErrors(lead.id, [
        `Follow-up ${n + 1} was not sent: ${e instanceof Error ? e.message : String(e)}`,
      ]);
    }
  }
  return tally;
}
