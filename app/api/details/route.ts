import { saveLeadDetails } from "@/lib/funnel/pick";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const result = await saveLeadDetails(await request.json().catch(() => null));
    return Response.json(result, { status: result.ok ? 200 : result.status });
  } catch (e) {
    console.error("POST /api/details failed", e);
    return Response.json({ ok: false, status: 500 }, { status: 500 });
  }
}
