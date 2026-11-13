import { captureLead } from "@/lib/funnel/capture";
import { leadCookie } from "@/lib/funnel/cookie";

export const dynamic = "force-dynamic";

/** Where the family lands after signing up. No link token in the address. */
const nextPage = (existing: boolean) => (existing ? "/pick?sent=1" : "/pick?new=1");

export async function POST(request: Request) {
  // The form normally posts JSON. If someone taps the button before the page's
  // script has loaded, the browser posts the form itself; that must work too.
  const isForm = !(request.headers.get("content-type") ?? "").includes("application/json");
  let raw: unknown;
  try {
    if (isForm) {
      const f = await request.formData();
      const text = (k: string) => String(f.get(k) ?? "");
      raw = {
        role: text("role") || "parent",
        firstName: text("firstName"),
        email: text("email"),
        parentEmail: text("parentEmail"),
        timezone: "",
        source: {},
        website: text("pispark-check"),
      };
    } else {
      raw = await request.json();
    }
  } catch {
    return Response.json(
      { ok: false, status: 400, issues: [{ path: "", message: "Invalid request" }] },
      { status: 400 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  try {
    const result = await captureLead(raw, { ip, now: new Date() });
    const headers = new Headers();
    if (result.ok && result.token) headers.append("Set-Cookie", leadCookie(result.token));

    if (isForm) {
      // Without script there is nowhere to show field errors, so send them back to the form.
      headers.set("Location", result.ok ? nextPage(result.existing) : "/book_a_lesson?retry=1");
      return new Response(null, { status: 303, headers });
    }
    if (!result.ok) return Response.json(result, { status: result.status, headers });
    // The token stays in the cookie; the page script has no use for it.
    return Response.json({ ok: true, existing: result.existing }, { headers });
  } catch (e) {
    console.error("POST /api/lead failed", e);
    if (isForm) return new Response(null, { status: 303, headers: { Location: "/book_a_lesson?retry=1" } });
    return Response.json({ ok: false, status: 500 }, { status: 500 });
  }
}
