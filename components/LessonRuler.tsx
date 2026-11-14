import { LESSON_MINUTES } from "@/lib/config";

/** One lesson, minute by minute. Widths are to scale. */
const PARTS = [
  { from: 0, to: 10, fill: "bg-white", title: "Last week's mistakes first", body: "We open the homework and go straight to what went wrong, while it is still fresh." },
  { from: 10, to: 40, fill: "bg-plot", title: "One idea, taught properly", body: "A single topic, chosen from your student's weak spots: explained, worked through together, then with the Desmos shortcut where there is one." },
  { from: 40, to: 55, fill: "bg-spark", title: "Against the clock", body: "A timed set of SAT-style questions on that idea, because knowing it and doing it in 95 seconds are different skills." },
  { from: 55, to: 60, fill: "bg-ink", title: "Homework, set and written down", body: "30 to 45 minutes for the week, from College Board's own question bank." },
];

export function LessonRuler() {
  return (
    <div className="mt-10">
      <div aria-hidden="true">
        <div className="flex h-10 overflow-hidden rounded-md border-2 border-ink sm:h-14">
          {PARTS.map((p) => (
            <div key={p.from} className={`${p.fill} border-r-2 border-ink last:border-r-0`} style={{ width: `${((p.to - p.from) / LESSON_MINUTES) * 100}%` }} />
          ))}
        </div>
        <div className="math relative mt-1 h-6 text-base not-italic text-ink-soft">
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
        {PARTS.map((p) => (
          <li key={p.from}>
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
