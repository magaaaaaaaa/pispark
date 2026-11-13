import { bookTrial } from "@/lib/booking/book";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: 400, issues: [{ path: "", message: "Invalid request" }] },
      { status: 400 },
    );
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  try {
    const result = await bookTrial(raw, { ip, now: new Date() });
    return Response.json(result, { status: result.ok ? 200 : result.status });
  } catch (e) {
    console.error("POST /api/book failed", e);
    return Response.json({ ok: false, status: 500 }, { status: 500 });
  }
}
