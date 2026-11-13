import type { Metadata } from "next";
import { CaptureForm } from "@/components/CaptureForm";
import { PRICE_PER_HOUR_USD, TRIAL_MINUTES } from "@/lib/config";

export const metadata: Metadata = {
  title: "Get a free trial lesson",
  description: "A free 25-minute 1-on-1 SAT math trial lesson with PiSpark. Takes ten seconds to claim.",
};

/** A short page for links from posts, ads and DMs: the offer and the form, nothing else. */
export default function BookALesson() {
  return (
    <section className="graph-paper">
      <div className="mx-auto max-w-xl px-5 py-10 sm:py-16">
        <div data-signup className="rounded-2xl border-2 border-ink bg-white p-5 shadow-[6px_6px_0_var(--color-spark)] sm:p-8">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
            Get a free SAT math trial lesson
          </h1>
          <p className="mb-6 mt-3 text-lg text-ink-soft">
            {TRIAL_MINUTES} minutes, live, 1-on-1. Leave your email, then pick a time. Lessons
            after that are ${PRICE_PER_HOUR_USD} an hour.
          </p>
          <CaptureForm />
        </div>
      </div>
    </section>
  );
}
