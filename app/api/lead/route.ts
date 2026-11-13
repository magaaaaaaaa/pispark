import { after } from "next/server";
import { captureLead, scheduleFollowUps } from "@/lib/funnel/capture";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ ok: false, status: 400, issues: [{ path: "", message: "Invalid request" }] }, { status: 400 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  try {
    const result = await captureLead(raw, { ip, now: new Date() });
    if (!result.ok) return Response.json(result, { status: result.status });
    const { created, ...body } = result;
    if (created) {
      // Queued after the response so the family is not kept waiting on it.
      after(() =>
        scheduleFollowUps(created, new Date()).catch((e) => console.error("scheduleFollowUps failed", e)),
      );
    }
    return Response.json(body);
  } catch (e) {
    console.error("POST /api/lead failed", e);
    return Response.json({ ok: false, status: 500 }, { status: 500 });
  }
}
