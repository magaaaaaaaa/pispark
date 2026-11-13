import "server-only";
import { Resend } from "resend";

export interface SendArgs {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  text: string;
  /** Calendar file contents, attached as trial-lesson.ics. */
  ics?: string;
  /** Deliver later instead of now. */
  scheduledAt?: Date;
  /** Adds the one-click unsubscribe header mail apps show next to the sender. */
  unsubscribeUrl?: string;
}

/** The owner stored the key in Vercel under the name RESEND; accept both names. */
const resendKey = () => process.env.RESEND_API_KEY || process.env.RESEND;

/** The email service allows about two requests a second. Stay under it. */
export const MIN_GAP_MS = 600;
const RETRY_AFTER_MS = 1500;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let queue: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

/** Run email-service calls one at a time, spaced out, however they were started. */
function paced<T>(call: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastCallAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    try {
      return await call();
    } finally {
      lastCallAt = Date.now();
    }
  });
  queue = run.catch(() => undefined);
  return run;
}

type ServiceError = { message: string; name?: string; statusCode?: number | null } | null;
const isRateLimit = (e: ServiceError) =>
  !!e && (e.statusCode === 429 || e.name === "rate_limit_exceeded");

/** One paced call, retried once if the service says we are going too fast. */
async function callService<T>(
  call: (client: Resend) => Promise<{ data: T | null; error: ServiceError }>,
): Promise<T | null> {
  const key = resendKey();
  if (!key) throw new Error("Email is not configured: set RESEND_API_KEY");
  const client = new Resend(key);
  let result = await paced(() => call(client));
  if (isRateLimit(result.error)) {
    await sleep(RETRY_AFTER_MS);
    result = await paced(() => call(client));
  }
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function sendEmail(args: SendArgs): Promise<{ id: string }> {
  const from = process.env.EMAIL_FROM || "PiSpark <book_a_lesson@pispark.site>";
  const data = await callService((client) =>
    client.emails.send({
      from,
      to: args.to,
      cc: args.cc,
      replyTo: process.env.OWNER_EMAIL || undefined,
      subject: args.subject,
      html: args.html,
      text: args.text,
      headers: args.unsubscribeUrl ? { "List-Unsubscribe": `<${args.unsubscribeUrl}>` } : undefined,
      attachments: args.ics
        ? [
            {
              filename: "trial-lesson.ics",
              content: Buffer.from(args.ics).toString("base64"),
              contentType: "text/calendar",
            },
          ]
        : undefined,
      scheduledAt: args.scheduledAt?.toISOString(),
    }),
  );
  if (!data) throw new Error("Email service returned no result");
  return { id: data.id };
}

/** Cancel an email scheduled with scheduledAt. Throws if it cannot be cancelled. */
export async function cancelEmail(id: string): Promise<void> {
  await callService((client) => client.emails.cancel(id));
}
