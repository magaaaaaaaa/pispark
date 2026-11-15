"use client";

import { useEffect, useRef, useState } from "react";
import { PenCircle, PenNote, PenTick } from "@/components/Pen";
import { TRIAL_MINUTES } from "@/lib/config";

/** 44 questions in 70 minutes. */
const SECONDS = 95;

/** Each wrong choice is a different mistake; naming it is the lesson. */
const CHOICES = [
  {
    letter: "A",
    value: "4",
    correct: false,
    verdict: "You solved for x, then stopped.",
    note: "x = 4 is right, and it is not what was asked. The question wants 4x + 6. Stopping one step early is how a question you fully understood becomes a lost point.",
  },
  {
    letter: "B",
    value: "8",
    correct: false,
    verdict: "That's 2x. Keep going.",
    note: "2x = 8 is a step on the way, not the destination. Under time pressure, the first clean number to appear feels like the finish line.",
  },
  {
    letter: "C",
    value: "16",
    correct: false,
    verdict: "So close. You dropped the + 6.",
    note: "4x is 16, and the question asks for 4x + 6. One more look at the last line of the question is worth more than any formula.",
  },
  {
    letter: "D",
    value: "22",
    correct: true,
    verdict: "Yes. But did you solve for x?",
    note: "You never needed to. 4x + 6 is exactly double 2x + 3, so the answer is 2 × 11. Five seconds, no algebra. Seeing that is a skill, and it can be taught.",
  },
] as const;

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function TryQuestion() {
  const root = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<number | null>(null);
  /** Seconds left; null until the card is first on screen. */
  const [left, setLeft] = useState<number | null>(null);
  /** Seconds used when the first answer was given. */
  const [took, setTook] = useState<number | null>(null);
  const answered = picked !== null;
  const choice = answered ? CHOICES[picked] : null;
  const running = left !== null && left > 0 && !answered;

  // The clock starts when the question is properly on screen, as it would on test day.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        // On a phone the card is taller than the screen, so "most of the screen" counts too.
        if (e.intersectionRatio >= 0.6 || e.intersectionRect.height >= window.innerHeight * 0.55) {
          setLeft((l) => l ?? SECONDS);
          io.disconnect();
        }
      },
      { threshold: [0, 0.2, 0.4, 0.6] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((l) => (l && l > 0 ? l - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const feedback = useRef<HTMLDivElement>(null);

  function pick(i: number) {
    if (took === null && left !== null) setTook(SECONDS - left);
    setPicked(i);
    // On a phone the verdict lands below the screen: bring its first lines into view.
    requestAnimationFrame(() => {
      const el = feedback.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (top > window.innerHeight * 0.6) {
        const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollBy({ top: top - window.innerHeight * 0.35, behavior: smooth ? "smooth" : "auto" });
      }
    });
  }

  const timeUp = left === 0 && !answered;

  return (
    <div ref={root} data-in="true" className="sheet p-5 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <p className="text-base font-bold text-ink-soft">Math, question 7</p>
        <p
          className={`math text-2xl not-italic tabular-nums ${left !== null && left <= 15 && !answered ? "text-pen" : "text-ink"}`}
          aria-label={left === null ? "95 seconds" : `${left} seconds left`}
        >
          {clock(answered && took !== null ? SECONDS - took : (left ?? SECONDS))}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-grid" aria-hidden="true">
        <div
          className="h-full origin-left rounded-full bg-ink transition-transform duration-1000 ease-linear"
          style={{ transform: `scaleX(${(answered && took !== null ? SECONDS - took : (left ?? SECONDS)) / SECONDS})` }}
        />
      </div>

      <p className="exam mt-7 text-2xl leading-snug text-ink sm:text-[1.7rem]">
        If <span className="math">2x + 3 = 11</span>, what is the value of{" "}
        <span className="math">4x + 6</span>?
      </p>

      <div role="group" aria-label="Answer choices" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {CHOICES.map((c, i) => (
          <button
            key={c.letter}
            type="button"
            aria-pressed={picked === i}
            onClick={() => pick(i)}
            className="relative flex min-h-14 items-baseline justify-center gap-2 rounded-lg border-2 border-ink bg-white px-3 py-3.5 text-ink transition-[background-color,transform] active:scale-[0.97] hover:bg-paper"
          >
            <span className="text-sm font-bold text-ink-soft">{c.letter}</span>
            <span className="exam text-3xl">{c.value}</span>
            {picked === i && <PenCircle key={`ring-${i}`} className="-inset-x-2 -inset-y-2" time={0.45} />}
            {answered && c.correct && (
              <span className="absolute -right-2 -top-4">
                <PenTick delay={picked === i ? 0.45 : 0.2} className="h-9 w-9" />
              </span>
            )}
          </button>
        ))}
      </div>

      <div ref={feedback} aria-live="polite">
        {timeUp && (
          <p className="mt-5 text-base leading-relaxed text-ink-soft">
            That was 95 seconds. On test day you would guess and move on. Here, take as long as you like.
          </p>
        )}
        {choice && (
          <div key={choice.letter} className="mt-7">
            <p className="text-[1.9rem] sm:text-4xl">
              <PenNote delay={0.5} time={0.7}>{choice.verdict}</PenNote>
            </p>
            {choice.correct && took !== null && (
              <p className="mt-2 text-base font-semibold text-ink-soft">
                You took {took < 2 ? "a second or two" : `${took} seconds`}.
              </p>
            )}
            <p className="mt-3 max-w-[58ch] text-lg leading-relaxed text-ink">{choice.note}</p>

            <div className="mt-6 grid gap-5 border-t-2 border-grid pt-5 sm:grid-cols-2">
              <div>
                <p className="text-base font-bold text-ink-soft">The way most students do it</p>
                <p className="exam mt-2 text-xl leading-relaxed text-ink">
                  <span className="math">2x = 8</span>
                  <br />
                  <span className="math">x = 4</span>
                  <br />
                  <span className="math">4(4) + 6 = 22</span>
                </p>
              </div>
              <div>
                <p className="text-base font-bold text-ink-soft">The way we teach it</p>
                <p className="exam mt-2 text-xl leading-relaxed text-ink">
                  <span className="math">4x + 6 = 2(2x + 3)</span>
                  <br />
                  <span className="math">= 2 × 11 = 22</span>
                </p>
              </div>
            </div>
            <p className="mt-5 text-base text-ink-soft">Tap another answer to see what that mistake would have meant.</p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a href="#start" className="btn inline-block px-5 py-3 text-lg">
                Get a free trial lesson
              </a>
              <p className="max-w-[30ch] text-base leading-snug text-ink-soft">
                {TRIAL_MINUTES} minutes of this, on your student&apos;s own mistakes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
