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
    <div ref={root} className="mt-10">
      <div className="relative">
        <div className="flex h-12 overflow-hidden rounded-md border-2 border-ink sm:h-16">
          {PARTS.map((p, i) => (
            <button
              key={p.from}
              type="button"
              aria-label={`Minutes ${p.from} to ${p.to}: ${p.title}`}
              aria-pressed={active === i}
              onClick={() => choose(i)}
              onMouseEnter={() => choose(i)}
              className={`${p.fill} border-r-2 border-ink transition-opacity last:border-r-0 ${active !== null && active !== i ? "opacity-35" : ""}`}
              style={{ width: `${((p.to - p.from) / LESSON_MINUTES) * 100}%` }}
            />
          ))}
        </div>
        {playing && (
          <div
            aria-hidden="true"
            className="playhead pointer-events-none absolute -bottom-2 -top-2 w-1 -translate-x-1/2 rounded-full bg-pen"
            style={{ ["--t" as string]: `${PLAY_SECONDS}s` }}
          />
        )}
        <div aria-hidden="true" className="math relative mt-1.5 h-6 text-base not-italic text-ink-soft">
          {[0, ...PARTS.map((p) => p.to)].map((m) => (
            <span
              key={m}
              className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
              style={{ left: `${(m / LESSON_MINUTES) * 100}%` }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
      <ol className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
        {PARTS.map((p, i) => (
          <li key={p.from} className={`transition-opacity duration-300 ${active !== null && active !== i ? "opacity-40" : ""}`}>
            <p className="flex items-center gap-2 text-base font-semibold text-ink-soft">
              <span aria-hidden="true" className={`${p.fill} inline-block h-4 w-4 rounded-sm border-2 border-ink`} />
              Minutes {p.from} to {p.to}
            </p>
            <h3 className="mt-2 text-xl font-bold leading-snug text-ink">{p.title}</h3>
            <p className="mt-2 text-base leading-relaxed text-ink-soft">{p.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
