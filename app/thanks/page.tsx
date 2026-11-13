import type { Metadata } from "next";
import Link from "next/link";
import { TrackLead } from "@/components/TrackLead";
import { CONTACT_EMAIL, TRIAL_MINUTES } from "@/lib/config";

export const metadata: Metadata = { title: "Booked", robots: { index: false } };

export default async function Thanks({ searchParams }: PageProps<"/thanks">) {
  const params = await searchParams;
  const existing = params.existing === "1";
  const later = params.later === "1";

  const heading = existing
    ? "You already have a trial lesson booked"
    : later
      ? "Request received"
      : "Your trial lesson is booked";

  return (
    <section className="graph-paper">
      <div className="mx-auto max-w-2xl px-5 py-14 sm:py-24">
        <div className="rounded-lg border-2 border-ink bg-white p-6 sm:p-10">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">{heading}</h1>
          {existing ? (
            <p className="mt-4 text-lg leading-relaxed text-ink">
              We found an upcoming trial lesson under this email, so we did not book a second one.
              The details are in the confirmation email we sent earlier. To change the time, write
              to <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          ) : later ? (
            <p className="mt-4 text-lg leading-relaxed text-ink">
              We will email you within 24 hours to agree a time that works. You can also reply to
              the email we just sent with a few times that suit you.
            </p>
          ) : (
            <>
              <p className="mt-4 text-lg leading-relaxed text-ink">
                A confirmation with the time, the video call details and a calendar invitation is
                on its way to your inbox. If it is not there in a few minutes, check the spam
                folder.
              </p>
              <ul className="mt-6 list-disc space-y-2 pl-6 text-lg text-ink">
                <li>The lesson is {TRIAL_MINUTES} minutes, 1-on-1, on a video call.</li>
                <li>Have paper, a pen and any recent SAT or PSAT score report nearby.</li>
                <li>You get reminders the day before and one hour before.</li>
              </ul>
            </>
          )}
          <p className="mt-8">
            <Link href="/" className="font-semibold underline">Back to the home page</Link>
          </p>
        </div>
      </div>
      {!existing && <TrackLead />}
    </section>
  );
}
