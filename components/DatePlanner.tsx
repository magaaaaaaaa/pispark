"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PenArrow, PenNote } from "@/components/Pen";
import { planChoice } from "@/lib/plan-choice";
import { prepPlan } from "@/lib/prep";
import type { SatOption } from "@/lib/sat-dates";

/** Counts quickly from the last number shown to the new one. */
function useCount(target: number) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const ms = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450;
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = ms ? Math.min(1, (now - t0) / ms) : 1;
      const v = Math.round(start + (target - start) * (1 - Math.pow(1 - k, 3)));
      from.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return shown;
}

const chip = (on: boolean) =>
  `rounded-lg border-2 px-4 py-2.5 text-lg font-bold transition-colors ${
    on ? "border-spark bg-spark text-ink" : "border-white/45 text-white hover:border-white"
  }`;

/**
 * "When is the test?" Pick a date, however close, and see what the time is
 * enough for. The plan that fits is passed on to the price list.
 */
export function DatePlanner({ options }: { options: SatOption[] }) {
  /** Index into options, or -1 for "not sure yet". */
  const [sel, setSel] = useState(options.length ? 0 : -1);
  const opt = sel >= 0 ? options[sel] : null;
  const plan = opt ? prepPlan(opt.days) : null;

  useEffect(() => {
    planChoice.set(plan?.plan ?? null);
  }, [plan?.plan]);

  const inWeeks = !!opt && opt.days > 60;
  const big = useCount(opt ? (inWeeks ? Math.floor(opt.days / 7) : opt.days) : 0);
  const pace = plan?.perWeek === 2 ? "two a week" : "one a week";
  const testEvery = plan ? 4 * plan.perWeek : 0;

  return (
    <div className="mt-8">
      <div role="radiogroup" aria-label="Test date" className="flex flex-wrap gap-3">
        {options.map((o, i) => (
          <button key={o.iso} type="button" role="radio" aria-checked={sel === i} onClick={() => setSel(i)} className={chip(sel === i)}>
            {o.short}
          </button>
        ))}
        <button type="button" role="radio" aria-checked={sel === -1} onClick={() => setSel(-1)} className={chip(sel === -1)}>
          Not sure yet
        </button>
      </div>

      <div aria-live="polite" className="mt-10 grid gap-x-14 gap-y-8 lg:grid-cols-[auto_1fr]">
        {opt && plan ? (
          <>
            <p className="font-display text-[5.5rem] font-extrabold leading-[0.85] tracking-tight text-white sm:text-[8rem]">
              <span className="tabular-nums">{big}</span>
              <span className="mt-3 block font-sans text-xl font-bold tracking-normal text-white/75">
                {inWeeks ? "weeks" : opt.days === 1 ? "day" : "days"} until {opt.day}
              </span>
            </p>
            <div key={opt.iso} data-in="true">
              <p className="font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                {plan.lessons > 0
                  ? `Room for ${plan.lessons} ${plan.lessons === 1 ? "lesson" : "lessons"} at ${pace}.`
                  : "No room for regular lessons, but the free one still fits."}
              </p>

              {plan.lessons > 0 && (
                <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-3" aria-hidden="true">
                  {Array.from({ length: plan.lessons }, (_, i) => {
                    const test = plan.practiceTests > 0 && (i + 1) % testEvery === 0;
                    return (
                      <span
                        key={i}
                        className={`pop rounded-full ${test ? "h-5 w-5 bg-spark" : "h-3 w-3 bg-white"}`}
                        style={{ "--d": `${i * 0.045}s` } as CSSProperties}
                      />
                    );
                  })}
                  <span
                    className="pop pulse relative ml-1 h-6 w-6 rounded-full bg-pen-light text-pen-light"
                    style={{ "--d": `${plan.lessons * 0.045 + 0.1}s` } as CSSProperties}
                  />
                  <span className="ml-1 text-base font-semibold text-white/85">test day</span>
                </div>
              )}
              {plan.practiceTests > 0 && (
                <p className="mt-3 flex items-center gap-2 text-base text-white/75">
                  <span aria-hidden="true" className="h-4 w-4 rounded-full bg-spark" />
                  {plan.practiceTests} full practice {plan.practiceTests === 1 ? "test" : "tests"}, each with a report to the parent
                </p>
              )}

              <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-white/90">{plan.enoughFor}</p>
              <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-white/70">
                {opt.registrationOpen
                  ? `Registration with College Board closes ${opt.registerBy}.`
                  : "Regular registration for this date has closed. If your student is already registered, all of this still applies."}
              </p>
              <p className="mt-6 flex flex-wrap items-center gap-x-3 text-3xl">
                <PenNote light delay={0.7} time={0.6}>
                  that&apos;s the
                </PenNote>
                <a href="#price" className="hand hand-light write underline decoration-2 underline-offset-4" style={{ "--d": "1.3s", "--t": "0.5s" } as CSSProperties}>
                  {plan.plan} plan
                </a>
                <PenArrow light delay={1.8} className="inline-block h-9 w-14 rotate-[20deg]" />
              </p>
            </div>
          </>
        ) : (
          <div className="lg:col-span-2">
            <p className="font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              Then start with the free lesson.
            </p>
            <p className="mt-4 max-w-[58ch] text-lg leading-relaxed text-white/90">
              It ends with a straight answer on which test date is realistic for the score your
              student wants, and a plan that counts back from it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
