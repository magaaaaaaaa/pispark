import type { Metadata } from "next";
import { BookingForm } from "@/components/BookingForm";
import { TRIAL_MINUTES } from "@/lib/config";

export const metadata: Metadata = {
  title: "Book a free trial lesson",
  description: "Book a free 25-minute 1-on-1 SAT math trial lesson with PiSpark.",
};

export default function BookALesson() {
  return (
    <section className="graph-paper">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
        <div className="rounded-lg border-2 border-ink bg-white p-5 sm:p-8">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
            Book a free trial lesson
          </h1>
          <p className="mb-8 mt-3 max-w-prose text-lg text-ink-soft">
            {TRIAL_MINUTES} minutes on a video call, 1-on-1 SAT math. You get a confirmation by
            email straight away.
          </p>
          <BookingForm />
        </div>
      </div>
    </section>
  );
}
