import { CaptureForm } from "@/components/CaptureForm";
import { HeroProblem } from "@/components/HeroProblem";
import { StickyCta } from "@/components/StickyCta";
import { PACK_SIZE, PRICE_PER_HOUR_USD, TRIAL_MINUTES } from "@/lib/config";
import { INSTAGRAM_DM_URL, MESSENGER_URL } from "@/lib/links";

const h2 = "font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl";
const section = "mx-auto max-w-5xl px-5 py-14 sm:py-20";

const steps = [
  {
    title: "Leave your email",
    body: "Ten seconds. That saves your free lesson, and nothing else is needed yet.",
  },
  {
    title: "Pick a time when it suits you",
    body: "On the next screen or later from your inbox. Evenings and weekends, shown in your time zone.",
  },
  {
    title: `${TRIAL_MINUTES} minutes, live, 1-on-1`,
    body: "We solve real SAT math questions together, find what is costing points, and email you a written plan. You decide what happens next.",
  },
];

const faqs = [
  {
    q: "Is the trial really free?",
    a: "Yes. No card, no deposit, and no obligation afterwards. It is how we show you a lesson instead of describing one.",
  },
  {
    q: `Why is it only $${PRICE_PER_HOUR_USD} an hour?`,
    a: "We are a small online school based in Kazakhstan, and we are new. Our costs are lower than a US tutoring center's, and our first students get the founding rate.",
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
    q: "Do you promise an 800?",
    a: "No, and be careful with anyone who does. The name is a joke and a goal. What we promise is full attention for the whole lesson and honest feedback on progress.",
  },
];

export default function Home() {
  return (
    <>
      <section className="border-b-2 border-ink bg-ink">
        <div className="mx-auto grid max-w-5xl gap-10 px-5 py-10 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <h1 className="font-display text-5xl font-extrabold leading-[0.98] tracking-tight text-white sm:text-7xl">
              The SAT math <span className="whitespace-nowrap">800 factory.</span>
            </h1>
            <p className="mt-6 max-w-xl text-xl leading-relaxed text-white">
              Live 1-on-1 SAT math lessons online, from a small school in Asia. Yes, the stereotype
              is true: we really, really like math.
            </p>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/80">
              Your first {TRIAL_MINUTES}-minute lesson is free. After that it is $
              {PRICE_PER_HOUR_USD} an hour.
            </p>
          </div>
          <div id="start" data-signup className="scroll-mt-4 rounded-2xl border-2 border-ink bg-white p-5 shadow-[6px_6px_0_var(--color-spark)] sm:p-7">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
              Get a free trial lesson
            </h2>
            <p className="mb-5 mt-1 text-base text-ink-soft">Takes ten seconds. Pick a time after.</p>
            <CaptureForm />
          </div>
        </div>
      </section>

      <section className="graph-paper border-b-2 border-ink">
        <div className={`${section} grid gap-10 lg:grid-cols-2 lg:items-center`}>
          <div>
            <h2 className={h2}>This is what a lesson feels like.</h2>
            <p className="mt-5 max-w-prose bg-white/85 text-lg leading-relaxed text-ink">
              One question, one idea, no jargon. Try it: read the question, think for a moment,
              then open the solution. In a lesson we do this live, on your student&apos;s own
              mistakes, until the idea holds under time pressure.
            </p>
          </div>
          <HeroProblem />
        </div>
      </section>

      <section className={section}>
        <h2 className={h2}>Three steps. The first takes ten seconds.</h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title}>
              <span className="math flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-spark text-2xl not-italic">
                {i + 1}
              </span>
              <h3 className="mt-4 text-xl font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y-2 border-ink bg-white">
        <div className={`${section} grid gap-10 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-16`}>
          <p className="font-display text-8xl font-extrabold tracking-tight text-ink sm:text-9xl">
            ${PRICE_PER_HOUR_USD}
            <span className="block text-2xl font-bold text-ink-soft">per hour, 1-on-1</span>
          </p>
          <div>
            <h2 className={h2}>Private tutoring at a group-class price.</h2>
            <p className="mt-5 max-w-prose text-lg leading-relaxed text-ink">
              This is the ${PRICE_PER_HOUR_USD}/hour founding-student rate for our first students.
              Lessons are booked in packs of {PACK_SIZE} lessons (${PRICE_PER_HOUR_USD * PACK_SIZE}{" "}
              per pack), every lesson is live and 1-on-1, and unused lessons are refunded if you
              stop.
            </p>
          </div>
        </div>
      </section>

      <section className={section}>
        <h2 className={h2}>Fair questions.</h2>
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

      <section className="border-t-2 border-ink bg-ink">
        <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              The first lesson costs nothing.
            </h2>
            <p className="mt-5 max-w-prose text-lg leading-relaxed text-white/85">
              Leave your email and pick a time whenever you like. Would you rather ask something
              first? Message us on{" "}
              <a href={INSTAGRAM_DM_URL} className="font-semibold text-spark underline">Instagram</a> or{" "}
              <a href={MESSENGER_URL} className="font-semibold text-spark underline">Messenger</a>.
            </p>
          </div>
          <div data-signup className="rounded-2xl border-2 border-ink bg-white p-5 sm:p-7">
            <CaptureForm />
          </div>
        </div>
      </section>

      <StickyCta />
    </>
  );
}
