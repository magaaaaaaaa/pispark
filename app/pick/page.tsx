import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { PickTime } from "@/components/PickTime";
import { CONTACT_EMAIL } from "@/lib/config";
import { LEAD_COOKIE } from "@/lib/funnel/cookie";
import { readLeadToken, tokenSecret } from "@/lib/funnel/token";
import { getLead } from "@/lib/leads/repo";
import type { Lead } from "@/lib/leads/schema";

export const metadata: Metadata = { title: "Pick a time", robots: { index: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const FINISHED = new Set(["trial_done", "offer_sent", "paying"]);

export default async function Pick({ searchParams }: PageProps<"/pick">) {
  const params = await searchParams;
  const isNew = one(params.new) === "1";
  const sent = one(params.sent) === "1";
  const slotParam = one(params.slot);
  const preselect =
    slotParam && !Number.isNaN(Date.parse(slotParam)) ? new Date(slotParam).toISOString() : null;

  // A link from an email carries the token; right after signing up it is in a cookie.
  // "sent" means a returning family was emailed their link: this browser gets nothing.
  const token = one(params.l) ?? (sent ? "" : ((await cookies()).get(LEAD_COOKIE)?.value ?? ""));

  let lead: Lead | null = null;
  let failed = false;
  const id = readLeadToken(token, tokenSecret());
  if (id) {
    try {
      lead = await getLead(id);
    } catch (e) {
      console.error("Pick page could not load the lead", e);
      failed = true;
    }
  }
  const finished = lead !== null && FINISHED.has(lead.stage);

  let heading = "This link has expired";
  let body = "Use the newest email from us, or ask for a fresh link.";
  if (finished) {
    heading = "This trial has already happened";
    body = "To arrange lessons, reply to any of our emails.";
  } else if (failed) {
    heading = "One moment";
    body = "We could not load your booking just now. The link in your email will work again in a minute.";
  } else if (sent) {
    heading = "Check your inbox";
    body = "You have signed up with this email before, so we have sent your personal link there again. Open it to pick or change your time.";
  } else if (isNew) {
    heading = "Check your inbox";
    body = "We have emailed you a link to pick a time for your free trial lesson. If it is not there in a few minutes, look in the spam folder.";
  }

  return (
    <section className="graph-paper">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
        <div className="rounded-2xl border-2 border-ink bg-white p-5 sm:p-8">
          {lead && !finished ? (
            <PickTime
              token={token}
              firstName={lead.contactName}
              timezone={lead.timezone}
              currentSlot={lead.stage === "trial_booked" ? lead.slot : null}
              preselect={preselect === lead.slot ? null : preselect}
              isNew={isNew}
            />
          ) : (
            <>
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">{heading}</h1>
              <p className="mt-4 text-lg leading-relaxed text-ink">
                {body} You can always write to{" "}
                <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              </p>
              <p className="mt-6"><Link href="/" className="font-semibold underline">Back to the home page</Link></p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
