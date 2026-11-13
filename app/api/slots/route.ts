import { generateSlots } from "@/lib/booking/slots";
import { bookedSlots } from "@/lib/leads/repo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const slots = generateSlots(now, await bookedSlots(now));
    return Response.json({ slots }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("GET /api/slots failed", e);
    return Response.json({ slots: [], error: "unavailable" }, { status: 503 });
  }
}
