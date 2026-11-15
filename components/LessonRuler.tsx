"use client";

import { useEffect, useRef, useState } from "react";
import { LESSON_MINUTES } from "@/lib/config";

/** One lesson, minute by minute. Widths are to scale. */
const PARTS = [
  { from: 0, to: 10, fill: "bg-white", title: "Last week's mistakes first", body: "We open the homework and go straight to what went wrong, while it is still fresh." },
  { from: 10, to: 40, fill: "bg-plot", title: "One idea, taught properly", body: "A single topic, chosen from your student's weak spots: explained, worked through together, then with the Desmos shortcut where there is one." },
  { from: 40, to: 55, fill: "bg-spark", title: "Against the clock", body: "A timed set of SAT-style questions on that idea, because knowing it and doing it in 95 seconds are different skills." },
  { from: 55, to: 60, fill: "bg-ink", title: "Homework, set and written down", body: "30 to 45 minutes for the week, from College Board's own question bank." },
];

/** How long the playhead takes to cross the hour. */
const PLAY_SECONDS = 7;

export function LessonRuler() {
  const root = useRef<HTMLDivElement>(null);
  /** The part the playhead is in, a part the visitor chose, or null when nothing is singled out. */
  const [active, setActive] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const chosen = useRef(false);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timers: ReturnType<typeof setTimeout>[] = [];
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        setPlaying(true);
        timers = PARTS.map((p, i) =>
          setTimeout(() => !chosen.current && setActive(i), (p.from / LESSON_MINUTES) * PLAY_SECONDS * 1000),
        );
        timers.push(
          setTimeout(() => {
            setPlaying(false);
            if (!chosen.current) setActive(null);
          }, PLAY_SECONDS * 1000),
        );
      },
      { rootMargin: "0px 0px -30% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  function choose(i: number) {
    chosen.current = true;
    setActive(i);
  }

  return (
    <div ref={root} className="mt-6 sm:mt-10">
      <div className="relative" aria-hidden="true">
        <div className="flex h-9 overflow-hidden rounded-md border-2 border-ink sm:h-16">
          {PARTS.map((p, i) => (
            <div
              key={p.from}
              onClick={() => choose(i)}
              onMouseEnter={() => choose(i)}
              className={`${p.fill} cursor-pointer border-r-2 border-ink transition-opacity last:border-r-0 ${active !== null && active !== i ? "opacity-35" : ""}`}
              style={{ width: `${((p.to - p.from) / LESSON_MINUTES) * 100}%` }}
            />
          ))}
        </div>
        {playing && (
          <div
            className="playhead pointer-events-none absolute -bottom-2 -top-2 w-1 -translate-x-1/2 rounded-full bg-pen"
            style={{ ["--t" as string]: `${PLAY_SECONDS}s` }}
          />
        )}
        <div className="math relative mt-1.5 h-6 text-base not-italic text-ink-soft">
          {[0, ...PARTS.map((p) => p.to)].map((m) => (
            <span
              key={m}
              // 55 sits too close to 60 on a phone.
              className={`absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full ${m === 55 ? "hidden sm:inline" : ""}`}
              style={{ left: `${(m / LESSON_MINUTES) * 100}%` }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
      {/* Phones: the four parts as a compact list; the one picked or playing is described below it. */}
      <ol className="mt-4 grid grid-cols-2 gap-2 sm:hidden">
        {PARTS.map((p, i) => (
          <li key={p.from}>
            <button
              type="button"
              aria-pressed={(active ?? 0) === i}
              aria-controls="lesson-part"
              onClick={() => choose(i)}
              className={`flex h-full w-full flex-col items-start rounded-lg border-2 px-3 py-2 text-left transition-colors ${(active ?? 0) === i ? "border-ink bg-paper" : "border-grid"}`}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
                <span aria-hidden="true" className={`${p.fill} inline-block h-3 w-3 rounded-sm border-2 border-ink`} />
                {p.from} to {p.to} min
              </span>
              <span className="mt-0.5 text-base font-bold leading-snug text-ink">{p.title}</span>
            </button>
          </li>
        ))}
      </ol>
      <p id="lesson-part" aria-live="polite" className="mt-3 min-h-[6.75rem] text-base leading-relaxed text-ink-soft sm:hidden">
        {PARTS[active ?? 0].body}
      </p>
      <ol className="mt-6 hidden gap-x-8 gap-y-7 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        {PARTS.map((p, i) => (
          <li key={p.from}>
            <button
              type="button"
              aria-pressed={active === i}
              onClick={() => choose(i)}
              className={`-mx-3 w-[calc(100%+1.5rem)] rounded-lg px-3 py-3 text-left transition-opacity duration-300 hover:bg-paper ${active !== null && active !== i ? "opacity-40" : ""}`}
            >
              <span className="flex items-center gap-2 text-base font-semibold text-ink-soft">
                <span aria-hidden="true" className={`${p.fill} inline-block h-4 w-4 rounded-sm border-2 border-ink`} />
                Minutes {p.from} to {p.to}
              </span>
              <span className="mt-2 block text-xl font-bold leading-snug text-ink">{p.title}</span>
              <span className="mt-2 block text-base leading-relaxed text-ink-soft">{p.body}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
