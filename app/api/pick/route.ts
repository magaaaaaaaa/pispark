import { pickSlot } from "@/lib/funnel/pick";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const result = await pickSlot(await request.json().catch(() => null), new Date());
    return Response.json(result, { status: result.ok ? 200 : result.status });
  } catch (e) {
    console.error("POST /api/pick failed", e);
    return Response.json({ ok: false, status: 500 }, { status: 500 });
  }
}
