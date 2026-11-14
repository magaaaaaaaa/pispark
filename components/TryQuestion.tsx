"use client";

import { useState } from "react";
import { TRIAL_MINUTES } from "@/lib/config";

// f(x) = x² − 6x + 5, drawn on x ∈ [−1, 7], y ∈ [−5, 6]. One grid square is one unit.
const U = 32;
const X_MIN = -1;
const X_MAX = 7;
const Y_MIN = -5;
const Y_MAX = 6;
const W = (X_MAX - X_MIN) * U;
const H = (Y_MAX - Y_MIN) * U;
const px = (x: number) => (x - X_MIN) * U;
const py = (y: number) => (Y_MAX - y) * U;
const f = (x: number) => x * x - 6 * x + 5;

const curve = (() => {
  const from = 3 - Math.sqrt(10); // where the curve leaves the top of the grid
  const to = 3 + Math.sqrt(10);
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const x = from + ((to - from) * i) / 60;
    pts.push(`${px(x).toFixed(1)},${py(f(x)).toFixed(1)}`);
  }
  return `M${pts.join(" L")}`;
})();

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** Each wrong choice is a different kind of mistake; naming it is the lesson. */
const CHOICES = [
  {
    letter: "A",
    value: "−5",
    correct: false,
    verdict: "Right method, one slip.",
    note: "You probably found x = 3, then lost a sign on the way: 9 − 18 + 5 is −4, not −5. More theory will not fix this. A ten-second checking habit will.",
  },
  {
    letter: "B",
    value: "−4",
    correct: true,
    verdict: "Correct. Now, how long did it take?",
    note: "The SAT allows about 95 seconds a question. If this took longer, the lesson is about speed: there is a way to do it in fifteen.",
  },
  {
    letter: "C",
    value: "3",
    correct: false,
    verdict: "You answered a different question.",
    note: "3 is where the minimum happens. The question asks what the minimum is, and that is y, not x. The math was fine; the last line of the question was not read.",
  },
  {
    letter: "D",
    value: "5",
    correct: false,
    verdict: "You took the number you could see.",
    note: "5 is the constant in the equation, where the curve crosses the y-axis. It is tempting when “minimum” does not yet mean “vertex” without thinking. That is a gap in one idea, and it takes one lesson.",
  },
] as const;

export function TryQuestion() {
  /** Index of the chosen answer, "skip" when the visitor asked to just see it, or null. */
  const [picked, setPicked] = useState<number | "skip" | null>(null);
  const answered = picked !== null;
  const choice = typeof picked === "number" ? CHOICES[picked] : null;

  return (
    <div className="rounded-2xl border-2 border-ink bg-white p-5 shadow-[8px_8px_0_var(--color-spark)] sm:p-7">
      <p className="text-base font-semibold text-ink-soft">
        Try one. On the SAT you get about 95 seconds.
      </p>
      <p className="mt-3 text-xl leading-snug text-ink">
        The function <span className="math">f</span> is defined by{" "}
        <span className="math">f(x) = x² − 6x + 5</span>. What is the minimum value of{" "}
        <span className="math">f(x)</span>?
      </p>

      <div role="group" aria-label="Answer choices" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CHOICES.map((c, i) => {
          const isPicked = picked === i;
          const reveal = answered && c.correct;
          return (
            <button
              key={c.letter}
              type="button"
              aria-pressed={isPicked}
              onClick={() => setPicked(i)}
              className={`flex items-baseline justify-center gap-2 rounded-lg border-2 border-ink px-3 py-3 text-ink transition-colors ${
                reveal ? "bg-spark" : isPicked ? "bg-ink text-white" : "bg-white hover:bg-paper"
              }`}
            >
              <span className="text-sm font-bold opacity-70">{c.letter}</span>
              <span className="math text-2xl">{c.value}</span>
            </button>
          );
        })}
      </div>

      <svg
        viewBox={`-14 -6 ${W + 28} ${H + 22}`}
        className="mx-auto mt-5 w-full max-w-xs"
        role="img"
        aria-label={
          answered
            ? "The parabola, opening upward, crossing the x-axis at 1 and 5, with its lowest point at 3, negative 4."
            : "Empty axes. The curve is drawn once you answer."
        }
      >
        {range(X_MIN, X_MAX).map((x) => (
          <line key={`v${x}`} x1={px(x)} y1={0} x2={px(x)} y2={H} stroke="var(--color-grid)" strokeWidth={1} />
        ))}
        {range(Y_MIN, Y_MAX).map((y) => (
          <line key={`h${y}`} x1={0} y1={py(y)} x2={W} y2={py(y)} stroke="var(--color-grid)" strokeWidth={1} />
        ))}
        <line x1={0} y1={py(0)} x2={W} y2={py(0)} stroke="var(--color-ink)" strokeWidth={2} />
        <line x1={px(0)} y1={0} x2={px(0)} y2={H} stroke="var(--color-ink)" strokeWidth={2} />
        <text x={W - 4} y={py(0) - 8} textAnchor="end" fontSize={15} className="math" fill="var(--color-ink-soft)">x</text>
        <text x={px(0) + 10} y={14} fontSize={15} className="math" fill="var(--color-ink-soft)">y</text>

        {!answered && (
          <text textAnchor="middle" fontSize={15} fill="var(--color-ink-soft)">
            <tspan x={px(3.5)} y={py(3) - 4}>Answer, and the curve</tspan>
            <tspan x={px(3.5)} dy={20}>draws itself.</tspan>
          </text>
        )}
        {answered && (
          <>
            <path
              d={curve}
              pathLength={1}
              className="plot-curve"
              fill="none"
              stroke="var(--color-plot)"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <g className="plot-vertex">
              <line x1={px(3)} y1={py(0)} x2={px(3)} y2={py(-4)} stroke="var(--color-ink)" strokeWidth={1.5} strokeDasharray="4 4" />
              <circle cx={px(3)} cy={py(-4)} r={9} fill="var(--color-spark)" stroke="var(--color-ink)" strokeWidth={2} />
              <text x={px(3)} y={py(-4) + 28} textAnchor="middle" fontSize={15} fontWeight={700} fill="var(--color-ink)">
                (3, −4)
              </text>
              {[[1, -11], [5, 11]].map(([x, dx]) => (
                <text key={x} x={px(x) + dx} y={py(0) + 18} textAnchor="middle" fontSize={14} fill="var(--color-ink-soft)">
                  {x}
                </text>
              ))}
            </g>
          </>
        )}
      </svg>

      {!answered && (
        <button
          type="button"
          onClick={() => setPicked("skip")}
          className="mt-3 text-base font-semibold text-ink underline underline-offset-4"
        >
          Just show me the answer
        </button>
      )}

      <div aria-live="polite">
        {answered && (
          <div className="mt-4 space-y-4">
            {choice && (
              <div className={`border-l-4 pl-4 ${choice.correct ? "border-plot" : "border-error"}`}>
                <p className="text-lg font-bold text-ink">{choice.verdict}</p>
                <p className="mt-1 text-base leading-relaxed text-ink">{choice.note}</p>
              </div>
            )}
            <ol className="list-decimal space-y-1 pl-5 text-base leading-relaxed text-ink">
              <li>The minimum of a parabola is its vertex.</li>
              <li>
                The vertex sits halfway between the roots.{" "}
                <span className="math">x² − 6x + 5 = (x − 1)(x − 5)</span>, so{" "}
                <span className="math">x = 3</span>.
              </li>
              <li>
                <span className="math">f(3) = 9 − 18 + 5 = −4</span>. The answer is B.
              </li>
            </ol>
            <p className="text-base leading-relaxed text-ink-soft">
              Faster on test day: type the equation into the built-in Desmos calculator and tap the
              lowest point. We teach both, so one checks the other.
            </p>
            <p className="text-base text-ink-soft">
              Tap another answer to see what that mistake would have meant.
            </p>
            <div className="rounded-lg bg-paper p-4">
              <p className="text-base leading-relaxed text-ink">
                That was one question. The free lesson is {TRIAL_MINUTES} minutes of this, on your
                student&apos;s own mistakes.
              </p>
              <a
                href="#start"
                className="mt-3 inline-block rounded-lg border-2 border-ink bg-spark px-5 py-3 text-lg font-extrabold text-ink"
              >
                Get a free trial lesson
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
