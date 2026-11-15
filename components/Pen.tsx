import type { CSSProperties } from "react";

/**
 * Marks made by the teacher's red pen. Each is an SVG laid over (or beside)
 * whatever it marks, drawn when a parent <Reveal> comes into view.
 * `delay` and `time` are seconds.
 */
type MarkProps = { delay?: number; time?: number; className?: string; light?: boolean };

const timing = (delay?: number, time?: number) =>
  ({ "--d": `${delay ?? 0}s`, ...(time ? { "--t": `${time}s` } : {}) }) as CSSProperties;

const base = "pointer-events-none absolute block";
const stroke = (light?: boolean) => `pen ${light ? "pen-light" : ""}`;

/** A loose ring around something, overshooting where it started. Stretches to its box. */
export function PenCircle({ delay, time = 0.6, className = "-inset-x-3 -inset-y-2", light }: MarkProps) {
  return (
    <span aria-hidden="true" className={`${base} ${className}`}>
      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="block h-full w-full overflow-visible" style={{ filter: "url(#rough)" }}>
      <path
        pathLength={1}
        className={stroke(light)}
        strokeWidth={2}
        style={timing(delay, time)}
        d="M14 30 C8 12 34 3 58 4 C84 5 97 15 94 28 C91 42 64 48 40 47 C16 46 3 38 8 24 C12 13 28 7 46 6"
      />
    </svg>
    </span>
  );
}

/** One quick underline. */
export function PenUnderline({ delay, time = 0.4, className = "inset-x-0 -bottom-2 h-3", light }: MarkProps) {
  return (
    <span aria-hidden="true" className={`${base} ${className}`}>
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="block h-full w-full overflow-visible" style={{ filter: "url(#rough)" }}>
      <path
        pathLength={1}
        className={stroke(light)}
        strokeWidth={1.7}
        style={timing(delay, time)}
        d="M1 6 C18 2 34 8 52 5 C68 2 84 7 99 4"
      />
    </svg>
    </span>
  );
}

/** A line through something we will not do. */
export function PenStrike({ delay, time = 0.35, className = "-inset-x-1 top-1/2 h-3 -translate-y-1/2", light }: MarkProps) {
  return (
    <span aria-hidden="true" className={`${base} ${className}`}>
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="block h-full w-full overflow-visible" style={{ filter: "url(#rough)" }}>
      <path
        pathLength={1}
        className={stroke(light)}
        strokeWidth={2.4}
        style={timing(delay, time)}
        d="M1 7 C22 3 46 8 68 4 C80 2 92 5 99 3"
      />
    </svg>
    </span>
  );
}

/** A teacher's tick. Keeps its shape; size it with the class. */
export function PenTick({ delay, time = 0.3, className = "h-7 w-7", light }: MarkProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={`overflow-visible ${className}`} style={{ filter: "url(#rough)" }}>
      <path pathLength={1} className={stroke(light)} style={timing(delay, time)} d="M4 17 C7 20 9 23 11 27 C15 17 21 9 29 3" />
    </svg>
  );
}

/** A curved arrow from a note to the thing it is about. Keeps its shape. */
export function PenArrow({ delay, time = 0.45, className = "h-10 w-16", light }: MarkProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 40" className={`overflow-visible ${className}`} style={{ filter: "url(#rough)" }}>
      <path pathLength={1} className={stroke(light)} style={timing(delay, time)} d="M3 6 C22 4 42 12 56 30" />
      <path pathLength={1} className={stroke(light)} style={timing((delay ?? 0) + time, 0.2)} d="M44 31 L57 32 L55 18" />
    </svg>
  );
}

/** A square bracket down the side of a group. Stretches to its box. */
export function PenBracket({ delay, time = 0.5, className = "inset-y-0 -right-6 w-4", light }: MarkProps) {
  return (
    <span aria-hidden="true" className={`${base} ${className}`}>
      <svg viewBox="0 0 10 100" preserveAspectRatio="none" className="block h-full w-full overflow-visible" style={{ filter: "url(#rough)" }}>
      <path
        pathLength={1}
        className={stroke(light)}
        strokeWidth={2}
        style={timing(delay, time)}
        d="M1 2 C6 2 8 3 8 8 L8 44 C8 48 9 50 10 50 C9 50 8 52 8 56 L8 92 C8 97 6 98 1 98"
      />
    </svg>
    </span>
  );
}

/** A handwritten note that writes itself, left to right. */
export function PenNote({
  children,
  delay,
  time,
  className = "",
  light,
}: MarkProps & { children: React.ReactNode }) {
  return (
    <span className={`hand write inline-block ${light ? "hand-light" : ""} ${className}`} style={timing(delay, time)}>
      {children}
    </span>
  );
}
