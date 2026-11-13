import type { Metadata } from "next";
import Link from "next/link";
import { PickTime } from "@/components/PickTime";
import { TrackLead } from "@/components/TrackLead";
import { readLeadToken, tokenSecret } from "@/lib/funnel/token";
import { CONTACT_EMAIL } from "@/lib/config";
import { getLead } from "@/lib/leads/repo";
import type { Lead } from "@/lib/leads/schema";

export const metadata: Metadata = { title: "Pick a time", robots: { index: false } };
export const dynamic = "force-dynamic";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Pick({ searchParams }: PageProps<"/pick">) {
  const params = await searchParams;
  const token = one(params.l) ?? "";
  const isNew = one(params.new) === "1";
  const slotParam = one(params.slot);
  const preselect = slotParam && !Number.isNaN(Date.parse(slotParam)) ? new Date(slotParam).toISOString() : null;

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

  const done = lead && lead.stage !== "new" && lead.stage !== "trial_booked";

  return (
    <section className="graph-paper">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
        <div className="rounded-2xl border-2 border-ink bg-white p-5 sm:p-8">
          {lead && !done ? (
            <PickTime
              token={token}
              firstName={lead.contactName}
              timezone={lead.timezone}
              currentSlot={lead.slot}
              preselect={preselect === lead.slot ? null : preselect}
              isNew={isNew}
            />
          ) : (
            <>
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
                {done ? "This trial has already happened" : isNew ? "Check your inbox" : "This link has expired"}
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-ink">
                {done
                  ? "To arrange lessons, reply to any of our emails."
                  : failed
                    ? "We could not load your booking just now. The link in your email will work again in a minute."
                    : isNew
                      ? "We have emailed you a link to pick a time for your free trial lesson. If it is not there in a few minutes, look in the spam folder."
                      : "Use the newest email from us, or ask for a fresh link."}{" "}
                You can always write to{" "}
                <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              </p>
              <p className="mt-6"><Link href="/" className="font-semibold underline">Back to the home page</Link></p>
            </>
          )}
        </div>
      </div>
      {isNew && <TrackLead />}
    </section>
  );
}
