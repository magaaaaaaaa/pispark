import "server-only";
import { sendEmail, type SendArgs } from "@/lib/email/send";
import { recordEmailError } from "@/lib/leads/repo";

/** Send in order; collect failures instead of throwing. `ids[i]` is null where message i failed. */
export async function sendAll(
  messages: SendArgs[],
): Promise<{ ids: (string | null)[]; errors: string[] }> {
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

/** Put email problems on the lead, where the owner sees them. Never throws. */
export async function noteEmailErrors(leadId: string, errors: string[]): Promise<void> {
  if (!errors.length) return;
  console.error("Email problems", { leadId, errors });
  try {
    await recordEmailError(leadId, errors.join(" | "));
  } catch (e) {
    console.error("Could not record email problems", e);
  }
}
