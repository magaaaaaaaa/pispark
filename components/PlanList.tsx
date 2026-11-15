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
          className="grid gap-x-8 gap-y-3 border-b-2 border-ink p-6 last:border-b-0 sm:p-8 md:grid-cols-[1fr_1fr_auto] md:items-center"
        >
          <div>
            <h3 className="font-display text-3xl font-extrabold tracking-tight text-ink">{p.name}</h3>
            <p className="mt-1 text-base leading-relaxed text-ink-soft">{p.what}</p>
          </div>
          <p className="text-base leading-relaxed text-ink">
            <span className="font-semibold">Right when:</span> {p.bestWhen.charAt(0).toLowerCase() + p.bestWhen.slice(1)}.
          </p>
          <div className="md:text-right">
            <p className="font-display text-5xl font-extrabold tracking-tight text-ink">
              <span className="relative inline-block">
                ${p.founding}
                {fits === p.name && <PenCircle key={p.name} delay={0.3} className="-inset-x-5 -inset-y-3" />}
              </span>
              <span className="ml-3 font-sans text-lg font-bold tracking-normal text-ink-soft">
                {p.once ? "once" : "per 4 weeks"}
              </span>
            </p>
            <p className="mt-1 text-base text-ink-soft">
              About ${Math.round(p.founding / p.lessons)} a lesson. Later <s>${p.regular}</s>.
            </p>
            {fits === p.name && (
              <p className="mt-1 text-2xl">
                <PenNote delay={0.9} time={0.6}>fits your test date</PenNote>
              </p>
            )}
          </div>
        </li>
      ))}
    </Reveal>
  );
}
