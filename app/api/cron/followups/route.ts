import { timingSafeEqual } from "node:crypto";
import { runFollowUps } from "@/lib/funnel/followups";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Called once a day by Vercel Cron (see vercel.json). Sends the follow-up nudges that are due. */
export async function GET(request: Request) {
  if (!authorised(request)) return new Response("Unauthorized", { status: 401 });
  try {
    const tally = await runFollowUps(new Date());
    console.log("Follow-ups run", tally);
    return Response.json({ ok: true, ...tally });
  } catch (e) {
    console.error("Follow-ups run failed", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
