/** Owner is in Astana: fixed UTC+5, no daylight saving. */
export const OWNER_UTC_OFFSET_MIN = 300;
export const TRIAL_MINUTES = 25;
export const SLOT_GRID_MIN = 30;
export const MIN_LEAD_HOURS = 12;
export const HORIZON_DAYS = 14;
export const LESSON_MINUTES = 60;
/** Founding prices hold for this many paying families, then regular prices apply. */
export const FOUNDING_FAMILIES = 10;
/** Notice needed to move a lesson. */
export const NOTICE_HOURS = 24;

export interface Plan {
  name: string;
  /** What the family gets, in a few words. */
  what: string;
  /** Lessons covered by one payment. */
  lessons: number;
  /** When this plan is the right one. */
  bestWhen: string;
  /** Founding price in USD: per 4 weeks, or once for a one-off plan. */
  founding: number;
  regular: number;
  once?: boolean;
}

/** Billed every 4 weeks in advance unless `once`. See docs/2026-11-14-pricing-and-program.md. */
export const PLANS: Plan[] = [
  { name: "Weekly", what: "1 lesson a week", lessons: 4, bestWhen: "The test is 3 months away or more", founding: 139, regular: 179 },
  {
    name: "Twice a week",
    what: "2 lessons a week",
    lessons: 8,
    bestWhen: "The test is less than 2 months away, or the goal is 100+ points up",
    founding: 259,
    regular: 339,
  },
  {
    name: "Test Sprint",
    what: "8 weeks before one SAT date: 16 lessons and 2 full practice tests reviewed",
    lessons: 16,
    bestWhen: "The test is 2 to 3 months away and everything should aim at it",
    founding: 499,
    regular: 649,
    once: true,
  },
];
export const FROM_PRICE_USD = Math.min(...PLANS.map((p) => p.founding));

/** "$139 per 4 weeks" or "$499 once". */
export const planPrice = (p: Plan) => `$${p.founding} ${p.once ? "once" : "per 4 weeks"}`;

/** Trial windows in owner time. days: 0 = Sunday. */
export const WINDOWS: { days: number[]; startHour: number; endHour: number }[] = [
  { days: [2, 3, 4, 5, 6], startHour: 5, endHour: 10 },
  { days: [6, 0], startHour: 19, endHour: 23 },
];

export const STAGES = [
  "new",
  "trial_booked",
  "trial_done",
  "offer_sent",
  "paying",
  "not_now",
  "lost",
] as const;
export type Stage = (typeof STAGES)[number];

export interface Teacher {
  /** First name, as families will hear it on the call. */
  name: string;
  /** Path under /public, portrait, 4:5. */
  photo: string;
  alt: string;
  /** A few short paragraphs in the teacher's own words. Facts only. */
  note: string[];
  /** The teacher's own SAT math score, out of 800. */
  satMath?: number;
}
/**
 * Shown on the home page. The photo is the teacher's own: only the background and the
 * shoulders the selfie cut off were redrawn, the face is untouched. Add `note` paragraphs
 * only with facts the teacher has confirmed.
 */
export const TEACHER: Teacher | null = {
  name: "Maga",
  photo: "/teacher.jpg",
  alt: "Maga, who teaches every PiSpark lesson, looking straight at the camera",
  satMath: 790,
  note: [
    "I scored 790 out of 800 on SAT math in November 2026, the 99th percentile, and I study mathematics at Nazarbayev University, Kazakhstan's English-language research university.",
    "I have been teaching math since I was in middle school myself, and the students I worked with went on to good grades at school. Now I teach one thing: the SAT math section, which I know inside out.",
  ],
};

export const CONTACT_EMAIL = "book_a_lesson@pispark.site";
export const DISCLAIMER =
  "SAT is a trademark of College Board, which is not affiliated with PiSpark.";

/** Required by US law in the footer of marketing email. */
export const POSTAL_ADDRESS = "PiSpark, Syganak 4, Astana 010000, Kazakhstan";
