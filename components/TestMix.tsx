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
    <Reveal className="mt-6 grid gap-x-16 gap-y-5 sm:mt-10 sm:gap-y-8 lg:grid-cols-[1fr_15rem]">
      <ul className="relative">
        {AREAS.map((a, i) => (
          <li key={a.name} className="border-t-2 border-grid py-3 last:border-b-2 sm:py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h3 className="text-lg font-bold leading-snug text-ink sm:text-xl">{a.name}</h3>
              <p className="text-sm text-ink-soft sm:text-base">{a.count}</p>
            </div>
            <p className="mt-0.5 text-sm text-ink-soft sm:mt-1 sm:text-base">{a.topics}</p>
            <div className="mt-2 flex items-center gap-3 sm:mt-3">
              <div className="h-2.5 flex-1 sm:h-4 overflow-hidden rounded-sm bg-grid/60">
                <div className={`grow h-full ${a.fill}`} style={{ width: `${(a.share / 35) * 100}%`, ["--d" as string]: `${0.15 * i}s` }} />
              </div>
              <span className="math w-12 text-right text-xl not-italic text-ink sm:w-14 sm:text-2xl">{a.share}%</span>
            </div>
          </li>
        ))}
        {/* The top two areas, bracketed by the teacher. */}
        <PenBracket delay={0.9} className="-right-7 top-2 hidden h-[calc(50%-0.75rem)] w-4 lg:block" />
      </ul>
      <div className="lg:pt-16">
        <p className="text-[1.65rem] leading-tight sm:text-3xl">
          <PenNote delay={1.4} time={0.9}>70% of the test is these two.</PenNote>
        </p>
        <p className="mt-1 text-[1.65rem] leading-tight sm:mt-2 sm:text-3xl">
          <PenNote delay={2.3} time={0.6}>We start here.</PenNote>
        </p>
      </div>
    </Reveal>
  );
}
