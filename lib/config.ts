/** Owner is in Astana: fixed UTC+5, no daylight saving. */
export const OWNER_UTC_OFFSET_MIN = 300;
export const TRIAL_MINUTES = 25;
export const SLOT_GRID_MIN = 30;
export const MIN_LEAD_HOURS = 12;
export const HORIZON_DAYS = 14;
export const PRICE_PER_HOUR_USD = 17;
export const PACK_SIZE = 8;

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

export const CONTACT_EMAIL = "hello@pispark.site";
export const DISCLAIMER =
  "SAT is a trademark of College Board, which is not affiliated with PiSpark.";
