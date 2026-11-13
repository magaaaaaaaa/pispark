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
}

export async function sendEmail(args: SendArgs): Promise<{ id: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email is not configured: set RESEND_API_KEY");
  const from = process.env.EMAIL_FROM || "PiSpark <book_a_lesson@pispark.site>";
  const { data, error } = await new Resend(key).emails.send({
    from,
    to: args.to,
    cc: args.cc,
    replyTo: process.env.OWNER_EMAIL || undefined,
    subject: args.subject,
    html: args.html,
    text: args.text,
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
  });
  if (error || !data) throw new Error(error?.message ?? "Email service returned no result");
  return { id: data.id };
}

/** Cancel an email scheduled with scheduledAt. Throws if it cannot be cancelled. */
export async function cancelEmail(id: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email is not configured: set RESEND_API_KEY");
  const { error } = await new Resend(key).emails.cancel(id);
  if (error) throw new Error(error.message);
}
