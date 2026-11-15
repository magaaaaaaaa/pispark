import { PenBracket, PenNote } from "@/components/Pen";
import { Reveal } from "@/components/Reveal";

/** The four content areas of digital SAT math and their share of the 44 questions (College Board). */
const AREAS = [
  { name: "Algebra", share: 35, count: "13 to 15 questions", topics: "Linear equations, systems, inequalities", fill: "bg-plot" },
  { name: "Advanced Math", share: 35, count: "13 to 15 questions", topics: "Quadratics, exponentials, functions", fill: "bg-plot" },
  { name: "Problem-Solving and Data Analysis", share: 15, count: "5 to 7 questions", topics: "Ratios, percentages, probability, statistics", fill: "bg-ink" },
  { name: "Geometry and Trigonometry", share: 15, count: "5 to 7 questions", topics: "Area, volume, triangles, circles, trigonometry", fill: "bg-ink" },
];

export function TestMix() {
  return (
    <Reveal className="mt-10 grid gap-x-16 gap-y-8 lg:grid-cols-[1fr_15rem]">
      <ul className="relative">
        {AREAS.map((a, i) => (
          <li key={a.name} className="border-t-2 border-grid py-5 last:border-b-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h3 className="text-xl font-bold text-ink">{a.name}</h3>
              <p className="text-base text-ink-soft">{a.count}</p>
            </div>
            <p className="mt-1 text-base text-ink-soft">{a.topics}</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-4 flex-1 overflow-hidden rounded-sm bg-grid/60">
                <div className={`grow h-full ${a.fill}`} style={{ width: `${(a.share / 35) * 100}%`, ["--d" as string]: `${0.15 * i}s` }} />
              </div>
              <span className="math w-14 text-right text-2xl not-italic text-ink">{a.share}%</span>
            </div>
          </li>
        ))}
        {/* The top two areas, bracketed by the teacher. */}
        <PenBracket delay={0.9} className="-right-7 top-2 hidden h-[calc(50%-0.75rem)] w-4 lg:block" />
      </ul>
      <div className="lg:pt-16">
        <p className="text-3xl leading-tight">
          <PenNote delay={1.4} time={0.9}>70% of the test is these two.</PenNote>
        </p>
        <p className="mt-2 text-3xl leading-tight">
          <PenNote delay={2.3} time={0.6}>We start here.</PenNote>
        </p>
      </div>
    </Reveal>
  );
}
