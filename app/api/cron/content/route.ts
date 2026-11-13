import { timingSafeEqual } from "node:crypto";
import { runContent } from "@/lib/content/publish";

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
    return Response.json({ ok: false }, { status: 500 });
  }
}
