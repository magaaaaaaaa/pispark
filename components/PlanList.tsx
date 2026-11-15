"use client";

import { useSyncExternalStore } from "react";
import { PenCircle, PenNote } from "@/components/Pen";
import { Reveal } from "@/components/Reveal";
import { PLANS } from "@/lib/config";
import { planChoice } from "@/lib/plan-choice";

/** The price list. The plan that fits the date picked in the planner gets ringed in pen. */
export function PlanList() {
  const fits = useSyncExternalStore(planChoice.subscribe, planChoice.get, () => null);

  return (
    <Reveal as="ul" className="sheet mt-10">
      {PLANS.map((p) => (
        <li
          key={p.name}
          className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-2 border-b-2 border-ink px-4 py-4 last:border-b-0 sm:p-8 md:grid-cols-[1fr_1fr_auto] md:items-center md:gap-x-8"
        >
          <div>
            <h3 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{p.name}</h3>
            <p className="mt-0.5 text-[0.95rem] leading-snug text-ink-soft sm:mt-1 sm:text-base sm:leading-relaxed">{p.what}</p>
          </div>
          <div className="text-right md:order-3">
            <p className="font-display text-[2rem] font-extrabold leading-none tracking-tight text-ink sm:text-5xl">
              <span className="relative inline-block">
                ${p.founding}
                {fits === p.name && <PenCircle key={p.name} delay={0.3} className="-inset-x-3 -inset-y-2 sm:-inset-x-5 sm:-inset-y-3" />}
              </span>
            </p>
            <p className="mt-1 whitespace-nowrap text-sm font-bold text-ink-soft sm:text-lg">
              {p.once ? "once" : "per 4 weeks"}
            </p>
          </div>
          <p className="col-span-2 text-[0.95rem] leading-snug text-ink sm:text-base sm:leading-relaxed md:order-2 md:col-span-1">
            <span className="font-semibold">Right when:</span> {p.bestWhen.charAt(0).toLowerCase() + p.bestWhen.slice(1)}.{" "}
            <span className="text-ink-soft">
              About ${Math.round(p.founding / p.lessons)} a lesson. Later <s>${p.regular}</s>.
            </span>
            {fits === p.name && (
              <span className="mt-1 block text-2xl">
                <PenNote delay={0.9} time={0.6}>fits your test date</PenNote>
              </span>
            )}
          </p>
        </li>
      ))}
    </Reveal>
  );
}
