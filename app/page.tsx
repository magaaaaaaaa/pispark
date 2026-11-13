import Link from "next/link";
import { BookingForm } from "@/components/BookingForm";
import { HeroProblem } from "@/components/HeroProblem";
import { PACK_SIZE, PRICE_PER_HOUR_USD, TRIAL_MINUTES } from "@/lib/config";

const h2 = "font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl";
const section = "mx-auto max-w-5xl px-5 py-14 sm:py-20";

const steps = [
  {
    title: "Book the free trial lesson",
    body: `Pick a time below. It takes two minutes and no payment details are asked for.`,
  },
  {
    title: `Meet for ${TRIAL_MINUTES} minutes on a video call`,
    body: "We work through a few SAT math questions together to see which topics are solid and which are costing points.",
  },
  {
    title: "Get a written plan",
    body: "After the call you get an email with what we saw, what to work on first, and how many lessons a week make sense before the test date.",
  },
  {
    title: "Start weekly 1-on-1 lessons",
    body: "If the plan suits you, lessons start the same week. If not, you keep the plan and owe nothing.",
  },
];

const faqs = [
  {
    q: "Is this for the digital SAT?",
    a: "Yes. Lessons follow the current digital SAT math section: algebra, advanced math, problem-solving and data analysis, and geometry and trigonometry. We also teach how to use the built-in Desmos calculator well.",
  },
  {
    q: "What do we need for a lesson?",
    a: "A laptop or tablet with a camera and microphone, a steady internet connection, and paper and pen. Lessons run on a video call with a shared whiteboard.",
  },
  {
    q: "We are in a different time zone. Does that work?",
    a: "Yes. The booking form shows every time in your own time zone, and lesson times are set around US evenings and weekend mornings.",
  },
  {
    q: "How does payment work?",
    a: `There is no payment on this site. After the trial you get an invoice by email for a pack of ${PACK_SIZE} lessons, payable online.`,
  },
  {
    q: "What if we need to move a lesson?",
    a: "Tell us at least 12 hours before and the lesson moves to another time at no cost.",
  },
  {
    q: "Do you promise a score?",
    a: "No, and you should be careful with anyone who does. What we promise is a clear plan, full attention for the whole lesson, and honest feedback on progress.",
  },
];

export default function Home() {
  return (
    <>
      <section className="graph-paper border-b-2 border-ink">
        <div className="mx-auto grid max-w-5xl gap-10 px-5 py-12 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div>
            <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-ink sm:text-7xl">
              SAT math, taught one student at a time.
            </h1>
            <p className="mt-6 max-w-xl bg-white/80 text-xl leading-relaxed text-ink">
              Live 1-on-1 lessons online for students in <span className="whitespace-nowrap">grades 10–12</span>. Start with a free{" "}
              {TRIAL_MINUTES}-minute trial lesson and leave with a written plan for the math
              section.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="#book"
                className="rounded-md border-2 border-ink bg-spark px-6 py-3 text-lg font-bold text-ink"
              >
                Book a free trial lesson
              </Link>
              <p className="bg-white/80 text-base text-ink-soft">
                Then ${PRICE_PER_HOUR_USD}/hour. No payment details needed to book.
              </p>
            </div>
          </div>
          <HeroProblem />
        </div>
      </section>

      <section className={section}>
        <h2 className={h2}>How it works</h2>
        <ol className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="math flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-white text-xl not-italic">
                {i + 1}
              </span>
              <div>
                <h3 className="text-xl font-bold text-ink">{s.title}</h3>
                <p className="mt-1 max-w-prose text-base leading-relaxed text-ink-soft">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y-2 border-ink bg-white">
        <div className={`${section} grid gap-12 lg:grid-cols-2`}>
          <div>
            <h2 className={h2}>Who teaches</h2>
            <p className="mt-6 max-w-prose text-lg leading-relaxed text-ink">
              Lessons are taught by PiSpark&apos;s founder, a math teacher who works on one thing:
              the SAT math section. Every lesson is live and 1-on-1. There are no recorded videos
              and no group classes.
            </p>
            <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink">
              Each lesson starts from the student&apos;s own mistakes. We find the step where a
              question went wrong, fix the idea behind it, then practice it on new questions until
              it holds under time pressure.
            </p>
          </div>
          <div>
            <h2 className={h2}>What it costs</h2>
            <p className="mt-6 font-display text-6xl font-extrabold tracking-tight text-ink">
              ${PRICE_PER_HOUR_USD}
              <span className="text-2xl font-bold text-ink-soft"> per hour</span>
            </p>
            <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink">
              This is the ${PRICE_PER_HOUR_USD}/hour founding-student rate for our first students. Lessons are
              booked in packs of {PACK_SIZE} lessons (${PRICE_PER_HOUR_USD * PACK_SIZE} per pack).
            </p>
            <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink">
              The trial lesson is free and you are not committed to anything after it.
            </p>
          </div>
        </div>
      </section>

      <section className={section}>
        <h2 className={h2}>Questions families ask</h2>
        <div className="mt-8 max-w-3xl divide-y-2 divide-grid border-y-2 border-grid">
          {faqs.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="cursor-pointer list-none text-lg font-bold text-ink marker:hidden">
                <span className="mr-2 inline-block w-4 text-plot group-open:hidden">+</span>
                <span className="mr-2 hidden w-4 text-plot group-open:inline-block">−</span>
                {f.q}
              </summary>
              <p className="mt-2 max-w-prose pl-6 text-base leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="book" className="graph-paper scroll-mt-4 border-t-2 border-ink">
        <div className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
          <div className="rounded-lg border-2 border-ink bg-white p-5 sm:p-8">
            <h2 className={h2}>Book a free trial lesson</h2>
            <p className="mb-8 mt-3 max-w-prose text-lg text-ink-soft">
              {TRIAL_MINUTES} minutes on a video call, 1-on-1. You get a confirmation by email
              straight away.
            </p>
            <BookingForm />
          </div>
        </div>
      </section>
    </>
  );
}
