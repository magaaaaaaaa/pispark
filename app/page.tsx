import Image from "next/image";
import Link from "next/link";
import { CaptureForm } from "@/components/CaptureForm";
import { DatePlanner } from "@/components/DatePlanner";
import { LessonRuler } from "@/components/LessonRuler";
import { MarkedSheet } from "@/components/MarkedSheet";
import { PenArrow, PenNote, PenStrike, PenUnderline } from "@/components/Pen";
import { PlanList } from "@/components/PlanList";
import { Reveal } from "@/components/Reveal";
import { StickyCta } from "@/components/StickyCta";
import { TestMix } from "@/components/TestMix";
import { TryQuestion } from "@/components/TryQuestion";
import {
  CONTACT_EMAIL,
  FOUNDING_FAMILIES,
  LESSON_MINUTES,
  NOTICE_HOURS,
  POSTAL_ADDRESS,
  TEACHER,
  TRIAL_MINUTES,
} from "@/lib/config";
import { INSTAGRAM_DM_URL, INSTAGRAM_URL, MESSENGER_URL } from "@/lib/links";
import { satOptions } from "@/lib/sat-dates";

/** The days-to-test-day figures are worked out from today's date, so refresh hourly. */
export const revalidate = 3600;

const h2 = "font-display text-[2rem] font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-[3.4rem]";
const wrap = "mx-auto max-w-6xl px-5";
const pad = "py-12 sm:py-24";
const lead = "mt-3 max-w-[60ch] text-base leading-relaxed sm:mt-5 sm:text-xl sm:leading-relaxed";

const steps = [
  {
    title: "Leave a first name and an email",
    body: "Ten seconds. No card, no phone number, no call from a salesperson.",
  },
  {
    title: "Pick a time that suits you",
    body: "On the next screen, or later from your inbox. Evenings and weekends, shown in your own time zone.",
  },
  {
    title: `${TRIAL_MINUTES} minutes, live, 1-on-1`,
    body: "We work real SAT questions together, find the mistakes that keep repeating, and email you a written plan. What happens after that is up to you.",
  },
];

const wont = [
  {
    title: "Promise a score",
    body: "Nobody honest can. We promise full attention for the whole lesson and straight feedback after it.",
  },
  {
    title: "Ask for a card before the free lesson",
    body: "A first name and an email are all it takes.",
  },
  {
    title: "Swap teachers",
    body: "The person your student meets in the free lesson teaches every lesson after it.",
  },
  {
    title: "Put your student in a group",
    body: "Every lesson is 1-on-1, so the whole hour goes on one student's mistakes.",
  },
  {
    title: "Lock you in",
    body: "Pay every 4 weeks. Cancel any time before the next payment, or pause for a holiday.",
  },
];

const faqs = [
  {
    q: "The test is only a few weeks away. Is it too late?",
    a: "No. A few weeks is enough to fix the mistakes that cost the most and to go in with a pacing plan. It is not enough to rebuild a topic from nothing, and we will tell you honestly which of your student's gaps are which.",
  },
  {
    q: "Why does it cost less than most SAT tutors?",
    a: `We are a small online school based in Kazakhstan, and we are new. Our costs are lower than a US tutoring center's, and our first ${FOUNDING_FAMILIES} families keep the founding price for as long as they stay.`,
  },
  {
    q: "When are the lessons?",
    a: `After the free lesson you pick a fixed weekly time (two for the twice-a-week and Sprint plans), shown in your own time zone: weekday evenings or weekend mornings in the US. It stays yours every week. With ${NOTICE_HOURS} hours' notice a lesson can move once every 4 weeks.`,
  },
  {
    q: "Is this for the digital SAT?",
    a: "Yes. Lessons follow the current digital SAT math section, including how to use the built-in Desmos calculator to save time.",
  },
  {
    q: "What do we need?",
    a: "A laptop or tablet with a camera, a steady connection, and paper and pen.",
  },
  {
    q: "How do we pay?",
    a: "By invoice, sent by email before each 4-week period starts. Nothing is charged automatically.",
  },
  {
    q: "What if it is not working for us?",
    a: "Stop before the next payment and nothing more is owed. If we ever cancel a lesson ourselves, it is made up or refunded, whichever you prefer.",
  },
];

export default function Home() {
  const dates = satOptions(new Date());

  return (
    <>
      {/* 1. A mistake gets found while you watch. */}
      <section className="graph-paper overflow-hidden border-b-2 border-ink">
        <div className={`${wrap} grid gap-8 py-8 sm:gap-12 sm:py-16 lg:grid-cols-[1fr_minmax(0,30rem)] lg:items-center lg:gap-10 lg:py-20`}>
          <Reveal>
            <h1 className="font-display text-[2.2rem] font-extrabold leading-[0.98] tracking-tight text-ink min-[375px]:text-[2.55rem] min-[410px]:text-[2.9rem] sm:text-7xl lg:text-[5.2rem]">
              <span className="block">Every wrong answer has a reason.</span>
              <span className="mt-2 block sm:mt-5">
                We teach{" "}
                <span className="relative inline-block whitespace-nowrap">
                  the reason.
                  <PenUnderline delay={0.9} time={0.5} className="inset-x-0 -bottom-3 h-4 sm:-bottom-4 sm:h-5" />
                </span>
              </span>
            </h1>
            <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-ink sm:mt-10 sm:text-2xl sm:leading-relaxed">
              <span className="box-decoration-clone bg-white/85">
                Live 1-on-1 SAT math lessons online. One teacher, a fixed time every week, and a
                plan built from your student&apos;s own mistakes.
              </span>
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-8">
              <a href="#start" data-signup className="btn inline-block px-7 py-4 text-xl">
                Get a free trial lesson
              </a>
              <p className="text-lg text-ink">
                <span className="bg-white/85">{TRIAL_MINUTES} minutes, live, no card.</span>
              </p>
            </div>
            {TEACHER?.satMath && (
              <p className="mt-5 max-w-[44ch] text-base leading-relaxed text-ink-soft sm:mt-8">
                <span className="box-decoration-clone bg-white/85">
                  Taught by {TEACHER.name}: {TEACHER.satMath} on SAT math, studying mathematics at
                  Nazarbayev University.
                </span>
              </p>
            )}
          </Reveal>
          <MarkedSheet />
        </div>
      </section>

      {/* 2. Now the visitor's own answer gets the same treatment. */}
      <section className="graph-ink border-b-2 border-ink">
        <div className={`${wrap} ${pad} grid gap-6 sm:gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start lg:gap-16`}>
          <div className="lg:sticky lg:top-28">
            <h2 className={`${h2} text-white`}>Your turn.</h2>
            <p className={`${lead} text-white/85`}>
              One question, the way it looks on the test, with the clock the SAT gives you. Pick an
              answer and see what a teacher reads in it.
            </p>
          </div>
          <TryQuestion />
        </div>
      </section>

      {/* 3. The offer and the form. */}
      <section className="border-b-2 border-ink bg-white">
        <div className={`${wrap} ${pad} grid gap-8 sm:gap-12 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-16`}>
          <div>
            <h2 className={`${h2} text-ink`}>The first lesson is free. Here is what happens.</h2>
            <ol className="mt-6 space-y-5 sm:mt-10 sm:space-y-8">
              {steps.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[2.25rem_1fr] gap-x-3 sm:grid-cols-[3rem_1fr] sm:gap-x-4">
                  <span className="exam flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-spark text-xl sm:h-12 sm:w-12 sm:text-2xl">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold leading-snug text-ink sm:text-xl">{s.title}</h3>
                    <p className="mt-1 max-w-[52ch] text-base leading-relaxed text-ink-soft sm:text-lg">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div id="start" data-signup className="sheet scroll-mt-24 self-start p-5 sm:p-7 lg:rotate-1">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
              Get a free trial lesson
            </h2>
            <p className="mb-5 mt-1 text-base text-ink-soft">Takes ten seconds. Pick a time after.</p>
            <CaptureForm />
          </div>
        </div>
      </section>

      {/* 4. What the test is made of. */}
      <section className="border-b-2 border-ink">
        <div className={`${wrap} ${pad}`}>
          <h2 className={`${h2} max-w-[20ch] text-ink`}>44 questions. 70 minutes. Four kinds of math.</h2>
          <p className={`${lead} text-ink`}>
            The math section is not a mystery. College Board publishes what is in it, and a prep
            plan should be weighted the same way the test is.
          </p>
          <TestMix />
        </div>
      </section>

      {/* 5. What an hour looks like. */}
      <section className="border-b-2 border-ink bg-white">
        <div className={`${wrap} ${pad}`}>
          <h2 className={`${h2} text-ink`}>Every lesson runs the same way.</h2>
          <p className={`${lead} text-ink`}>
            {LESSON_MINUTES} minutes, and none of them improvised. A student who knows what is coming
            spends the hour on the math.
          </p>
          <LessonRuler />
        </div>
      </section>

      {/* 6. However close the test is. */}
      <section className="graph-ink border-b-2 border-ink">
        <div className={`${wrap} ${pad}`}>
          <h2 className={`${h2} text-white`}>When is the test?</h2>
          <p className={`${lead} text-white/85`}>
            Pick the date. Three weeks or six months, there is a sensible way to use the time, and
            we will tell you plainly what it can and cannot do.
          </p>
          <DatePlanner options={dates} />
        </div>
      </section>

      {/* 7. Who is on the other end of the call. */}
      <section className="border-b-2 border-ink bg-white">
        <div className={`${wrap} ${pad} grid gap-10 sm:gap-14 lg:grid-cols-2 lg:gap-20`}>
          <div>
            <h2 className={`${h2} text-ink`}>Who you would be trusting.</h2>
            {TEACHER && (
              <Reveal as="figure" className="mt-6 flex flex-row items-center gap-4 sm:mt-10 sm:items-end sm:gap-3 lg:flex-col lg:items-start lg:gap-5 xl:flex-row xl:items-end xl:gap-3">
                <div className="sheet w-[42%] max-w-[19rem] shrink-0 -rotate-2 p-1.5 sm:w-full sm:p-3">
                  <Image
                    src={TEACHER.photo}
                    alt={TEACHER.alt}
                    width={880}
                    height={1100}
                    sizes="(min-width: 640px) 19rem, 42vw"
                    className="aspect-[4/5] w-full rounded-[3px] object-cover"
                  />
                </div>
                <figcaption className="-rotate-3 text-[1.4rem] min-[375px]:text-[1.55rem] sm:mb-14 sm:whitespace-nowrap sm:text-[1.65rem] lg:mb-0 lg:text-[1.9rem] xl:mb-14 xl:text-[1.75rem]">
                  <PenNote delay={0.5} time={0.5}>I&apos;m {TEACHER.name}.</PenNote>
                  <br />
                  {TEACHER.satMath && (
                    <>
                      <PenNote delay={1.0} time={0.7}>{TEACHER.satMath} on SAT math.</PenNote>
                      <br />
                    </>
                  )}
                  <PenNote delay={TEACHER.satMath ? 1.7 : 1.0} time={0.8}>I teach every lesson.</PenNote>
                  <PenArrow delay={TEACHER.satMath ? 2.6 : 1.9} className="ml-2 hidden h-10 w-16 -scale-x-100 rotate-[35deg] sm:block lg:hidden xl:block" />
                </figcaption>
              </Reveal>
            )}
            {TEACHER?.note.map((t, i) => (
              <p key={t} className={`${i === 0 ? "mt-6 sm:mt-10" : "mt-3 sm:mt-4"} max-w-[60ch] text-base leading-relaxed text-ink sm:text-lg`}>{t}</p>
            ))}
            <p className={`${TEACHER ? "mt-3 sm:mt-4" : "mt-6"} max-w-[60ch] text-base leading-relaxed text-ink sm:text-lg`}>
              PiSpark is a small online school in Astana, Kazakhstan. Yes, the stereotype is true:
              we really, really like math.
            </p>
            <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-ink sm:mt-4 sm:text-lg">
              See how we explain things before you talk to us: we post SAT math every weekday on{" "}
              <a href={INSTAGRAM_URL} className="font-semibold underline underline-offset-4">
                Instagram, @pispark.math
              </a>
              .
            </p>
            <address className="mt-6 hidden text-base not-italic leading-loose text-ink-soft sm:block">
              {POSTAL_ADDRESS}
              <br />
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">{CONTACT_EMAIL}</a>
              <br />
              <Link href="/terms" className="underline underline-offset-4">Terms in plain English</Link>
            </address>
          </div>
          <div>
            <h3 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Five things we will not do.
            </h3>
            <Reveal as="ul" className="mt-4 divide-y-2 divide-grid border-y-2 border-grid sm:mt-6">
              {wont.map((w, i) => (
                <li key={w.title} className="py-3.5 sm:py-5">
                  <p className="text-xl font-bold text-ink sm:text-2xl">
                    {/* A title can wrap on a phone, so there the strike is drawn per line. */}
                    <span className="strike sm:hidden" style={{ ["--d" as string]: `${0.2 + i * 0.3}s` }}>
                      {w.title}
                    </span>
                    <span className="relative hidden sm:inline-block">
                      {w.title}
                      <PenStrike delay={0.2 + i * 0.45} />
                    </span>
                  </p>
                  <p className="mt-1 max-w-[52ch] text-base leading-relaxed text-ink-soft sm:text-lg">{w.body}</p>
                </li>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      {/* 8. The price. */}
      <section id="price" className="graph-paper scroll-mt-16 border-b-2 border-ink">
        <div className={`${wrap} ${pad}`}>
          <h2 className={`${h2} text-ink`}>
            <span className="box-decoration-clone bg-white/85">The price, in full.</span>
          </h2>
          <p className={`${lead} text-ink`}>
            <span className="box-decoration-clone bg-white/85">
              Lessons, homework, practice tests and reports are all included. These are founding
              prices for our first {FOUNDING_FAMILIES} families, kept for as long as you stay.
            </span>
          </p>
          <PlanList />
          <p className="mt-6 max-w-[60ch] text-base leading-relaxed text-ink sm:mt-8 sm:text-lg">
            <span className="box-decoration-clone bg-white/85">
              Not sure which? The free lesson ends with a recommendation based on the test date and
              the score you are aiming for.
            </span>
          </p>
        </div>
      </section>

      {/* 9. Questions. */}
      <section className="border-b-2 border-ink">
        <div className={`${wrap} ${pad} grid gap-6 sm:gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-20`}>
          <h2 className={`${h2} text-ink`}>Fair questions.</h2>
          <div className="divide-y-2 divide-grid border-y-2 border-grid">
            {faqs.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex min-h-12 cursor-pointer list-none items-baseline gap-3 py-3.5 text-lg font-bold sm:min-h-14 sm:py-4 sm:text-xl text-ink marker:hidden [&::-webkit-details-marker]:hidden">
                  <span aria-hidden="true" className="exam w-4 shrink-0 text-2xl leading-none text-plot transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                  {f.q}
                </summary>
                <p className="max-w-[60ch] pb-5 pl-7 text-base leading-relaxed text-ink-soft sm:text-lg">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 10. The ask. */}
      <section className="graph-ink">
        <div className={`${wrap} ${pad} grid gap-8 sm:gap-12 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-center lg:gap-16`}>
          <Reveal>
            <h2 className={`${h2} text-white`}>Find out what is costing the points.</h2>
            <p className={`${lead} text-white/85`}>
              One free {TRIAL_MINUTES}-minute lesson, and you leave with a written plan whether or
              not you ever pay us. Would you rather ask something first? Message us on{" "}
              <a href={INSTAGRAM_DM_URL} className="font-semibold text-spark underline underline-offset-4">Instagram</a> or{" "}
              <a href={MESSENGER_URL} className="font-semibold text-spark underline underline-offset-4">Messenger</a>.
            </p>
            <p className="mt-5 text-3xl sm:mt-8 sm:text-4xl">
              <PenNote light delay={0.3} time={0.9}>See you in the lesson.</PenNote>
            </p>
          </Reveal>
          <div data-signup className="sheet p-5 sm:p-7 lg:-rotate-1">
            <CaptureForm />
          </div>
        </div>
      </section>

      <StickyCta />
    </>
  );
}
