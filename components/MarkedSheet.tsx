import type { CSSProperties } from "react";
import { Reveal } from "@/components/Reveal";

const at = (d: number, t?: number) => ({ "--d": `${d}s`, ...(t ? { "--t": `${t}s` } : {}) }) as CSSProperties;

/** A line of handwriting in the SVG, with the paper-coloured cover that slides off as it is written. */
function Written({
  x,
  y,
  size,
  width,
  d,
  t,
  className,
  children,
}: {
  x: number;
  y: number;
  size: number;
  width: number;
  d: number;
  t: number;
  className: string;
  children: string;
}) {
  return (
    <>
      <text x={x} y={y} fontSize={size} className={className}>
        {children}
      </text>
      <rect className="cover" x={x - 6} y={y - size} width={width} height={size * 1.45} fill="#fff" style={at(d, t)} />
    </>
  );
}

/**
 * The hero: a student's scratch work for one SAT question, marked by the
 * teacher as you watch. Steps that are right get a tick, the slip gets a ring,
 * and the note says what kind of mistake it was.
 */
export function MarkedSheet() {
  return (
    <Reveal className="relative mx-auto w-full max-w-[30rem] lg:mr-0">
      <div aria-hidden="true" className="sheet absolute inset-0 rotate-[2.5deg]" />
      <div className="sheet relative -rotate-1 p-2 sm:p-3">
        <svg
          viewBox="0 0 520 580"
          className="block w-full"
          role="img"
          aria-label="A student's working for an SAT question, marked in red pen. The first two steps are ticked. The final answer, negative 5, is circled and corrected to negative 4. The teacher's note reads: Right method. One slip. That's a habit, not a gap. Fix: write the negative 9 down before adding."
        >
          <text x={36} y={44} fontSize={15} fontWeight={700} className="fill-ink-soft font-sans">
            Question 12
          </text>
          <g fontSize={22} className="exam fill-ink">
            <text x={36} y={82}>
              The function <tspan fontStyle="italic">f</tspan> is defined by
            </text>
            <text x={36} y={112}>
              <tspan fontStyle="italic">f(x) = x² − 6x + 5</tspan>. What is the minimum
            </text>
            <text x={36} y={142}>
              value of <tspan fontStyle="italic">f(x)</tspan>?
            </text>
          </g>
          <line x1={36} y1={168} x2={484} y2={168} stroke="var(--color-grid)" strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" />

          {/* The student's pencil. */}
          <Written x={44} y={222} size={31} width={330} d={0.3} t={0.8} className="font-pencil fill-pencil">
            vertex:  x = 6 / 2 = 3
          </Written>
          <Written x={44} y={278} size={31} width={300} d={1.2} t={0.7} className="font-pencil fill-pencil">
            f(3) = 9 - 18 + 5
          </Written>
          <Written x={114} y={334} size={31} width={110} d={2.0} t={0.3} className="font-pencil fill-pencil">
            = -5
          </Written>

          {/* The teacher's pen. */}
          <g style={{ filter: "url(#rough)" }}>
            <path pathLength={1} className="pen" style={at(2.5, 0.25)} d="M372 208 C375 212 377 216 379 222 C384 210 391 201 401 194" />
            <path pathLength={1} className="pen" style={at(2.75, 0.25)} d="M338 264 C341 268 343 272 345 278 C350 266 357 257 367 250" />
            <path
              pathLength={1}
              className="pen"
              style={at(3.1, 0.5)}
              d="M148 328 C142 308 164 298 188 299 C212 300 226 311 223 325 C220 340 196 347 174 345 C154 343 139 336 144 320 C147 311 158 305 172 303"
            />
            <path pathLength={1} className="pen" style={at(3.65, 0.3)} d="M232 322 C242 318 250 316 262 316" />
            <path pathLength={1} className="pen" style={at(3.95, 0.15)} d="M252 308 L264 316 L253 325" />
            <path pathLength={1} className="pen" style={at(6.0, 0.4)} d="M44 446 C120 440 210 449 300 443 C340 440 380 444 408 441" />
          </g>
          <Written x={276} y={310} size={27} width={220} d={4.1} t={0.5} className="font-hand fill-pen">
            9 - 18 = -9
          </Written>
          <Written x={276} y={346} size={27} width={220} d={4.6} t={0.5} className="font-hand fill-pen">
            -9 + 5 = -4
          </Written>
          <Written x={44} y={432} size={38} width={440} d={5.2} t={0.8} className="font-hand fill-pen">
            Right method. One slip.
          </Written>
          <Written x={44} y={492} size={30} width={440} d={6.4} t={0.7} className="font-hand fill-pen">
            That&apos;s a habit, not a gap.
          </Written>
          <Written x={44} y={536} size={27} width={460} d={7.2} t={0.8} className="font-hand fill-pen">
            Fix: write the -9 down before adding.
          </Written>
        </svg>
      </div>
    </Reveal>
  );
}
