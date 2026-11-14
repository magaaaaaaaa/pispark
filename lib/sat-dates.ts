/**
 * SAT weekend test dates, from College Board's dates and deadlines page
 * (satsuite.collegeboard.org/sat/dates-deadlines), checked 2026-11-14.
 * Dates College Board lists only as "anticipated" are shown by month, because
 * the exact day can still move. Add new dates here once a year.
 */
const SAT_DATES: { date: string; label: string; registerBy?: string }[] = [
  { date: "2026-12-05", label: "December 5, 2026", registerBy: "November 20" },
  { date: "2027-03-06", label: "March 6, 2027", registerBy: "February 19" },
  { date: "2027-05-01", label: "May 1, 2027", registerBy: "April 16" },
  { date: "2027-06-05", label: "June 5, 2027", registerBy: "May 21" },
  { date: "2027-08-28", label: "August 2027" },
  { date: "2027-09-18", label: "September 2027" },
  { date: "2027-10-09", label: "October 2027" },
  { date: "2027-11-06", label: "November 2027" },
  { date: "2027-12-04", label: "December 2027" },
  { date: "2028-03-04", label: "March 2028" },
  { date: "2028-05-06", label: "May 2028" },
  { date: "2028-06-03", label: "June 2028" },
];

/** Test dates that have not passed yet, soonest first, as the text shown to families. */
export function upcomingSatDates(now: Date): string[] {
  const today = now.toISOString().slice(0, 10);
  return SAT_DATES.filter((d) => d.date >= today).map((d) => d.label);
}

const DAY_MS = 86_400_000;
/** Fewer weeks than this is too short to prepare for properly. */
export const MIN_PREP_WEEKS = 8;

export interface PrepTarget {
  /** "March 6, 2027" */
  label: string;
  /** "February 19": the regular registration deadline. */
  registerBy: string;
  /** Whole weeks from now to the test, so the number of weekly lessons that fit. */
  weeks: number;
  /** Practice tests that fit at one every 4 weeks. */
  practiceTests: number;
}

/** The soonest confirmed test date that still leaves enough weeks to prepare, or null. */
export function prepTarget(now: Date): PrepTarget | null {
  for (const d of SAT_DATES) {
    if (!d.registerBy) continue;
    const weeks = Math.floor((Date.parse(`${d.date}T00:00:00Z`) - now.getTime()) / (7 * DAY_MS));
    if (weeks >= MIN_PREP_WEEKS) {
      return { label: d.label, registerBy: d.registerBy, weeks, practiceTests: Math.floor(weeks / 4) };
    }
  }
  return null;
}
