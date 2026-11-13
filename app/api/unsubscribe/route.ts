import { unsubscribeLead } from "@/lib/funnel/pick";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
    const ok = await unsubscribeLead(body?.token);
    return Response.json({ ok }, { status: ok ? 200 : 404 });
  } catch (e) {
    console.error("POST /api/unsubscribe failed", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
