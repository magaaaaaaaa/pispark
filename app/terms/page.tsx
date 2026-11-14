import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL, DISCLAIMER, FOUNDING_FAMILIES, LESSON_MINUTES, NOTICE_HOURS, PLANS, planPrice, TRIAL_MINUTES } from "@/lib/config";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <LegalPage title="Terms" updated="November 14, 2026">
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
        <li>
          Lessons are 1-on-1, live, by video call, and last {LESSON_MINUTES} minutes, at a fixed
          weekly time agreed after the trial lesson.
        </li>
        <li>
          Plans and founding prices:{" "}
          {PLANS.map((p) => `${p.name} (${p.what}), ${planPrice(p)}`).join("; ")}. Founding prices
          apply to our first {FOUNDING_FAMILIES} paying families and are kept while the plan
          continues without a break of more than 4 weeks.
        </li>
        <li>
          Plans are invoiced by email and paid in advance. The Weekly and Twice a week plans are
          paid every 4 weeks; the Test Sprint is paid once or in two equal parts.
        </li>
        <li>A student under 18 needs a parent or guardian to agree to these terms and to pay.</li>
      </ul>

      <h2>Moving, missing or pausing</h2>
      <ul>
        <li>
          Tell us at least {NOTICE_HOURS} hours before a lesson and it moves to another free time
          that week or the next, once every 4 weeks.
        </li>
        <li>
          A lesson missed or cancelled with less than {NOTICE_HOURS} hours&apos; notice counts as
          taken.
        </li>
        <li>If we have to cancel, the lesson is made up or refunded, whichever you prefer.</li>
        <li>You can pause for up to 2 weeks in each 4-week period; the next payment moves back.</li>
        <li>Lessons not used by the end of the following 4-week period expire.</li>
      </ul>

      <h2>Stopping and refunds</h2>
      <p>
        You can cancel the Weekly or Twice a week plan at any time before the next payment, and
        nothing more is charged. Payments already made are not refunded, except for lessons we
        cancelled. If you stop a Test Sprint early, lessons not yet taken are refunded on request.
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
