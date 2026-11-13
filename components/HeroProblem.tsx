"use client";

import { useState } from "react";

// y = x² − 6x + 5, drawn on x ∈ [−1, 7], y ∈ [−5, 6]. One grid square is one unit.
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

export function HeroProblem() {
  const [shown, setShown] = useState(false);

  return (
    <figure className="rounded-lg border-2 border-ink bg-white p-4 sm:p-6">
      <figcaption className="text-base text-ink">
        <p className="font-semibold">A question like the ones on the digital SAT</p>
        <p className="mt-2">
          The graph of <span className="math">y = x² − 6x + 5</span> is shown. What is the minimum
          value of <span className="math">y</span>?
        </p>
      </figcaption>

      <svg
        viewBox={`-14 -6 ${W + 28} ${H + 22}`}
        className="mt-4 w-full max-w-sm"
        role="img"
        aria-label="A parabola opening upward that crosses the x-axis at 1 and 5 and has its lowest point between them."
      >
        {range(X_MIN, X_MAX).map((x) => (
          <line key={`v${x}`} x1={px(x)} y1={0} x2={px(x)} y2={H} stroke="var(--color-grid)" strokeWidth={1} />
        ))}
        {range(Y_MIN, Y_MAX).map((y) => (
          <line key={`h${y}`} x1={0} y1={py(y)} x2={W} y2={py(y)} stroke="var(--color-grid)" strokeWidth={1} />
        ))}
        <line x1={0} y1={py(0)} x2={W} y2={py(0)} stroke="var(--color-ink)" strokeWidth={2} />
        <line x1={px(0)} y1={0} x2={px(0)} y2={H} stroke="var(--color-ink)" strokeWidth={2} />
        {[[1, -10], [3, 0], [5, 10]].map(([x, dx]) => (
          <text key={x} x={px(x) + dx} y={py(0) + 16} textAnchor="middle" fontSize={13} fill="var(--color-ink-soft)">
            {x}
          </text>
        ))}
        {[5, -4].map((y) => (
          <text key={y} x={px(0) - 6} y={py(y) + 4} textAnchor="end" fontSize={13} fill="var(--color-ink-soft)">
            {y < 0 ? `−${-y}` : y}
          </text>
        ))}

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
          <circle cx={px(3)} cy={py(-4)} r={9} fill="var(--color-spark)" stroke="var(--color-ink)" strokeWidth={2} />
          {shown && (
            <text x={px(3) + 14} y={py(-4) + 5} fontSize={14} fontWeight={700} fill="var(--color-ink)">
              (3, −4)
            </text>
          )}
        </g>
      </svg>

      <button
        type="button"
        aria-expanded={shown}
        aria-controls="hero-solution"
        onClick={() => setShown((s) => !s)}
        className="mt-4 rounded-md border-2 border-ink px-4 py-2 text-sm font-semibold hover:bg-paper"
      >
        {shown ? "Hide the solution" : "Show the solution"}
      </button>

      <div id="hero-solution" hidden={!shown} className="mt-4 space-y-2 text-base">
        <p>
          The lowest point of a parabola is its vertex. Its <span className="math">x</span>-value
          is halfway between the two places the curve crosses the axis:{" "}
          <span className="math">x = (1 + 5) / 2 = 3</span>.
        </p>
        <p>
          Put that back in: <span className="math">y = 3² − 6·3 + 5 = 9 − 18 + 5 = −4</span>.
        </p>
        <p className="font-semibold">The minimum value of y is −4.</p>
        <p className="text-ink-soft">
          On test day there is a faster way: type the equation into the built-in Desmos calculator
          and tap the lowest point. We teach both, so you can check one against the other.
        </p>
      </div>
    </figure>
  );
}
