import { after } from "next/server";
import { finishBooking, pickSlot } from "@/lib/funnel/pick";

export const dynamic = "force-dynamic";
// Room for the reminder scheduling that runs after the answer is sent.
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const result = await pickSlot(await request.json().catch(() => null), new Date());
    if (!result.ok) return Response.json(result, { status: result.status });
    const { finish, ...body } = result;
    if (finish) {
      after(() => finishBooking(finish, new Date()).catch((e) => console.error("finishBooking failed", e)));
    }
    return Response.json(body);
  } catch (e) {
    console.error("POST /api/pick failed", e);
    return Response.json({ ok: false, status: 500 }, { status: 500 });
  }
}
