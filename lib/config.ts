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
  /** Founding price in USD: per 4 weeks, or once for a one-off plan. */
  founding: number;
  regular: number;
  once?: boolean;
}

/** Billed every 4 weeks in advance unless `once`. See docs/2026-11-14-pricing-and-program.md. */
export const PLANS: Plan[] = [
  { name: "Weekly", what: "1 lesson a week", founding: 139, regular: 179 },
  { name: "Twice a week", what: "2 lessons a week", founding: 259, regular: 339 },
  {
    name: "Test Sprint",
    what: "8 weeks before one SAT date: 16 lessons and 2 full practice tests reviewed",
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

export const CONTACT_EMAIL = "book_a_lesson@pispark.site";
export const DISCLAIMER =
  "SAT is a trademark of College Board, which is not affiliated with PiSpark.";

/** Required by US law in the footer of marketing email. */
export const POSTAL_ADDRESS = "PiSpark, Syganak 4, Astana 010000, Kazakhstan";
