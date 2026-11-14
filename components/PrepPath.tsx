import type { PrepTarget } from "@/lib/sat-dates";

/** The weeks from now to the test, one dot a lesson, a larger one for each practice test. */
export function PrepPath({ target }: { target: PrepTarget }) {
  const weeks = Array.from({ length: target.weeks }, (_, i) => i + 1);
  const day = target.label.replace(/, \d{4}$/, "");
  return (
    <figure className="mt-10">
      <div className="relative flex items-center justify-between" aria-hidden="true">
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-white/40" />
        <span className="relative h-5 w-0.5 bg-white" />
        {weeks.map((w) =>
          w % 4 === 0 ? (
            <span key={w} className="relative h-4 w-4 rounded-full border-2 border-ink bg-spark sm:h-5 sm:w-5" />
          ) : (
            <span key={w} className="relative h-1.5 w-1.5 rounded-full bg-white sm:h-2.5 sm:w-2.5" />
          ),
        )}
        <span className="relative h-7 w-7 rotate-45 border-2 border-white bg-plot sm:h-8 sm:w-8" />
      </div>
      <div className="mt-3 flex justify-between text-base font-semibold text-white">
        <span>This week</span>
        <span>SAT, {day}</span>
      </div>
      <figcaption className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-base text-white/85">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-white" />A weekly lesson
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-4 w-4 rounded-full bg-spark" />
          Practice test and a progress report to the parent
        </span>
      </figcaption>
    </figure>
  );
}
