import { timingSafeEqual } from "node:crypto";
import { runContent } from "@/lib/content/publish";
import { sendEmail } from "@/lib/email/send";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Called once a day by Vercel Cron (see vercel.json). Publishes the approved post that is due. */
export async function GET(request: Request) {
  if (!authorised(request)) return new Response("Unauthorized", { status: 401 });
  try {
    const run = await runContent(new Date());
    console.log("Content run", run);
    return Response.json({ ok: true, ...run });
  } catch (e) {
    console.error("Content run failed", e);
    // A silent failure here would mean silent days. Say so, if email still works.
    if (process.env.OWNER_EMAIL) {
      const text = `The daily posting job stopped with an error, so nothing was published today: ${e instanceof Error ? e.message : String(e)}\n\nIf this repeats tomorrow, something needs fixing.`;
      await sendEmail({ to: process.env.OWNER_EMAIL, subject: "PiSpark: the daily posting job failed", text, html: `<p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>` }).catch((err) =>
        console.error("Could not email the owner", err),
      );
    }
    return Response.json({ ok: false }, { status: 500 });
  }
}
