import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL, DISCLAIMER, PACK_SIZE, PRICE_PER_HOUR_USD, TRIAL_MINUTES } from "@/lib/config";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <LegalPage title="Terms" updated="November 13, 2026">
      <p>
        These terms cover the trial lesson and paid lessons with PiSpark, run from Astana,
        Kazakhstan. Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>The trial lesson</h2>
      <p>
        The first lesson is a free {TRIAL_MINUTES}-minute trial lesson. Booking it does not commit
        you to anything, and no payment details are taken.
      </p>

      <h2>Paid lessons</h2>
      <ul>
        <li>Lessons are 1-on-1, live, by video call, and last one hour unless agreed otherwise.</li>
        <li>
          The price is ${PRICE_PER_HOUR_USD} per hour. Lessons are sold in packs of {PACK_SIZE}{" "}
          lessons, invoiced by email and paid before the first lesson of the pack.
        </li>
        <li>A student under 18 needs a parent or guardian to agree to these terms and to pay.</li>
      </ul>

      <h2>Moving or missing a lesson</h2>
      <ul>
        <li>Tell us at least 12 hours before a lesson and it moves to another time at no cost.</li>
        <li>A lesson missed or cancelled with less than 12 hours&apos; notice counts as taken.</li>
        <li>If we have to cancel, the lesson is rescheduled or refunded, whichever you prefer.</li>
      </ul>

      <h2>Refunds</h2>
      <p>
        You can stop at any time. Lessons in a pack that have not been taken are refunded on
        request.
      </p>

      <h2>Results</h2>
      <p>
        We work hard to help every student improve, but a test score depends on many things
        outside a tutor&apos;s control. We do not promise any particular score or admission
        result.
      </p>

      <h2>College Board</h2>
      <p>{DISCLAIMER} All practice questions we write are our own.</p>
    </LegalPage>
  );
}
