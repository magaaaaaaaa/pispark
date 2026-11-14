import Image from "next/image";
import Link from "next/link";
import { CaptureForm } from "@/components/CaptureForm";
import { LessonRuler } from "@/components/LessonRuler";
import { PrepPath } from "@/components/PrepPath";
import { StickyCta } from "@/components/StickyCta";
import { TryQuestion } from "@/components/TryQuestion";
import {
  CONTACT_EMAIL,
  FOUNDING_FAMILIES,
  LESSON_MINUTES,
  NOTICE_HOURS,
  PLANS,
  POSTAL_ADDRESS,
  TEACHER,
  TRIAL_MINUTES,
} from "@/lib/config";
import { INSTAGRAM_DM_URL, INSTAGRAM_URL, MESSENGER_URL } from "@/lib/links";
import { prepTarget } from "@/lib/sat-dates";

/** The weeks-to-test-day figures are worked out from today's date, so refresh hourly. */
export const revalidate = 3600;

const h2 = "font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl";
const wrap = "mx-auto max-w-6xl px-5";
const pad = "py-16 sm:py-24";
const lead = "mt-5 max-w-[62ch] text-lg leading-relaxed";
const cta = "inline-block rounded-lg border-2 border-ink bg-spark px-6 py-4 text-xl font-extrabold text-ink";

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
  const target = prepTarget(new Date());

  return (
    <>
      <section className="graph-paper border-b-2 border-ink">
        <div className={`${wrap} grid gap-10 py-10 sm:py-16 lg:grid-cols-[1fr_minmax(0,30rem)] lg:items-start lg:gap-14`}>
          <div className="lg:pt-6">
            <h1 className="font-display text-[2.75rem] font-extrabold leading-[0.98] tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]">
              <span className="block">Every wrong answer has a reason.</span>
              <span className="mt-3 block lg:mt-4">We teach the reason.</span>
            </h1>
            <p className="mt-6 max-w-[46ch] text-xl leading-relaxed text-ink">
              <span className="box-decoration-clone bg-white/80">
                Live 1-on-1 SAT math lessons online. One teacher, a fixed time every week, and a
                plan built from your student&apos;s own mistakes.
              </span>
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a href="#start" data-signup className={cta}>Get a free trial lesson</a>
              <p className="text-base text-ink">
                <span className="bg-white/80">{TRIAL_MINUTES} minutes, live, no card.</span>
              </p>
            </div>
          </div>
          <TryQuestion />
        </div>
      </section>

      <section className="border-b-2 border-ink bg-white">
        <div className={`${wrap} ${pad} grid gap-12 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-16`}>
          <div>
            <h2 className={`${h2} text-ink`}>The first lesson is free. Here is what happens.</h2>
            <ol className="mt-10 space-y-8">
              {steps.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[3rem_1fr] gap-x-4">
                  <span className="math flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-spark text-2xl not-italic">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-ink">{s.title}</h3>
                    <p className="mt-1 max-w-[52ch] text-base leading-relaxed text-ink-soft">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div
            id="start"
            data-signup
            className="scroll-mt-6 self-start rounded-2xl border-2 border-ink bg-white p-5 shadow-[8px_8px_0_var(--color-spark)] sm:p-7"
          >
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
              Get a free trial lesson
            </h2>
            <p className="mb-5 mt-1 text-base text-ink-soft">Takes ten seconds. Pick a time after.</p>
            <CaptureForm />
          </div>
        </div>
      </section>

      <section className="border-b-2 border-ink">
        <div className={`${wrap} ${pad}`}>
          <h2 className={`${h2} text-ink`}>Every lesson runs the same way.</h2>
          <p className={`${lead} text-ink`}>
            {LESSON_MINUTES} minutes, and none of them improvised. A student who knows what is coming
            spends the hour on the math.
          </p>
          <LessonRuler />
        </div>
      </section>

      <section className="border-b-2 border-ink bg-ink text-white">
        <div className={`${wrap} ${pad}`}>
          {target ? (
            <>
              <h2 className={`${h2} max-w-[22ch]`}>
                Start this week: {target.weeks} lessons and {target.practiceTests} practice tests
                before the {target.label.replace(/, \d{4}$/, "")} SAT.
              </h2>
              <p className={`${lead} text-white/85`}>
                That is the next test date with enough room to prepare properly. Registration with
                College Board closes {target.registerBy}. Every 4 weeks your student takes a
                practice test in Bluebook, the app used on test day, and you get a short report:
                the score, what moved, and what the next 4 weeks are for.
              </p>
              <PrepPath target={target} />
              <p className="mt-8 max-w-[62ch] text-base leading-relaxed text-white/85">
                Aiming for a different date? The free lesson ends with a plan for yours.
              </p>
            </>
          ) : (
            <>
              <h2 className={`${h2} max-w-[22ch]`}>A plan that counts back from the test date.</h2>
              <p className={`${lead} text-white/85`}>
                Tell us the date your student is aiming for and the free lesson ends with a week-by-week
                plan. Every 4 weeks there is a practice test in Bluebook, the app used on test day,
                and a short report for the parent.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="border-b-2 border-ink bg-white">
        <div className={`${wrap} ${pad} grid gap-14 lg:grid-cols-2 lg:gap-20`}>
          <div>
            <h2 className={`${h2} text-ink`}>Who you would be trusting.</h2>
            {TEACHER ? (
              <div className="mt-8">
                <Image
                  src={TEACHER.photo}
                  alt={TEACHER.alt}
                  width={640}
                  height={800}
                  sizes="(min-width: 1024px) 24rem, 80vw"
                  className="aspect-[4/5] w-full max-w-sm rounded-2xl border-2 border-ink object-cover shadow-[8px_8px_0_var(--color-spark)]"
                />
                <p className="mt-8 text-2xl font-bold text-ink">{TEACHER.name} teaches every lesson.</p>
                {TEACHER.note.map((t) => (
                  <p key={t} className="mt-3 max-w-[52ch] text-lg leading-relaxed text-ink">{t}</p>
                ))}
              </div>
            ) : (
              <p className={`${lead} text-ink`}>
                PiSpark is a small online school in Astana, Kazakhstan. Yes, the stereotype is true:
                we really, really like math. One teacher takes every lesson, so the person your
                student meets in the free lesson is the person they keep.
              </p>
            )}
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-ink">
              You do not have to take our word for how we explain things. Every weekday we post SAT
              math on{" "}
              <a href={INSTAGRAM_URL} className="font-semibold underline underline-offset-4">
                Instagram, @pispark.math
              </a>
              : worked questions, common mistakes, calculator shortcuts. Read a few before you talk
              to us.
            </p>
            <address className="mt-6 text-base not-italic leading-relaxed text-ink-soft">
              {POSTAL_ADDRESS}
              <br />
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">{CONTACT_EMAIL}</a>
              <br />
              <Link href="/terms" className="underline underline-offset-4">Terms in plain English</Link>
            </address>
          </div>
          <div>
            <h3 className="font-display text-3xl font-extrabold tracking-tight text-ink">
              Five things we will not do.
            </h3>
            <ul className="mt-6 divide-y-2 divide-grid border-y-2 border-grid">
              {wont.map((w) => (
                <li key={w.title} className="grid grid-cols-[1.75rem_1fr] gap-x-3 py-5">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-1 h-6 w-6 text-error">
                    <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
                  </svg>
                  <div>
                    <p className="text-xl font-bold text-ink">{w.title}</p>
                    <p className="mt-1 text-base leading-relaxed text-ink-soft">{w.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="graph-paper border-b-2 border-ink">
        <div className={`${wrap} ${pad}`}>
          <h2 className={`${h2} text-ink`}>
            <span className="box-decoration-clone bg-white/80">The price, in full.</span>
          </h2>
          <p className={`${lead} text-ink`}>
            <span className="box-decoration-clone bg-white/80">
              Lessons, homework, practice tests and reports are all included. These are founding
              prices for our first {FOUNDING_FAMILIES} families, kept for as long as you stay.
            </span>
          </p>
          <ul className="mt-10 rounded-2xl border-2 border-ink bg-white shadow-[8px_8px_0_var(--color-spark)]">
            {PLANS.map((p) => (
              <li
                key={p.name}
                className="grid gap-x-8 gap-y-3 border-b-2 border-ink p-6 last:border-b-0 sm:p-8 md:grid-cols-[1fr_1fr_auto] md:items-center"
              >
                <div>
                  <h3 className="font-display text-3xl font-extrabold tracking-tight text-ink">{p.name}</h3>
                  <p className="mt-1 text-base leading-relaxed text-ink-soft">{p.what}</p>
                </div>
                <p className="text-base leading-relaxed text-ink">
                  <span className="font-semibold">Right when:</span> {p.bestWhen.charAt(0).toLowerCase() + p.bestWhen.slice(1)}.
                </p>
                <div className="md:text-right">
                  <p className="font-display text-5xl font-extrabold tracking-tight text-ink">
                    ${p.founding}
                    <span className="ml-2 font-sans text-lg font-bold tracking-normal text-ink-soft">
                      {p.once ? "once" : "per 4 weeks"}
                    </span>
                  </p>
                  <p className="mt-1 text-base text-ink-soft">
                    About ${Math.round(p.founding / p.lessons)} a lesson. Later <s>${p.regular}</s>.
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-[62ch] text-lg leading-relaxed text-ink">
            <span className="box-decoration-clone bg-white/80">
              Not sure which? The free lesson ends with a recommendation based on the test date and
              the score you are aiming for.
            </span>
          </p>
        </div>
      </section>

      <section className="border-b-2 border-ink">
        <div className={`${wrap} ${pad} grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-20`}>
          <h2 className={`${h2} text-ink`}>Fair questions.</h2>
          <div className="divide-y-2 divide-grid border-y-2 border-grid">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-baseline gap-3 text-xl font-bold text-ink marker:hidden [&::-webkit-details-marker]:hidden">
                  <span aria-hidden="true" className="w-4 shrink-0 text-plot group-open:hidden">+</span>
                  <span aria-hidden="true" className="hidden w-4 shrink-0 text-plot group-open:inline">−</span>
                  {f.q}
                </summary>
                <p className="mt-2 max-w-[62ch] pl-7 text-base leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink">
        <div className={`${wrap} ${pad} grid gap-12 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-center lg:gap-16`}>
          <div>
            <h2 className={`${h2} text-white`}>Find out what is costing the points.</h2>
            <p className={`${lead} text-white/85`}>
              One free {TRIAL_MINUTES}-minute lesson, and you leave with a written plan whether or
              not you ever pay us. Would you rather ask something first? Message us on{" "}
              <a href={INSTAGRAM_DM_URL} className="font-semibold text-spark underline underline-offset-4">Instagram</a> or{" "}
              <a href={MESSENGER_URL} className="font-semibold text-spark underline underline-offset-4">Messenger</a>.
            </p>
          </div>
          <div data-signup className="rounded-2xl border-2 border-ink bg-white p-5 shadow-[8px_8px_0_var(--color-spark)] sm:p-7">
            <CaptureForm />
          </div>
        </div>
      </section>

      <StickyCta />
    </>
  );
}
