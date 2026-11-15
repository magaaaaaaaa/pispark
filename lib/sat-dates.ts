/**
 * SAT weekend test dates, from College Board's dates and deadlines page
 * (satsuite.collegeboard.org/sat/dates-deadlines), checked 2026-11-14.
 * Dates College Board lists only as "anticipated" are shown by month, because
 * the exact day can still move; those have no registration deadline here.
 * Add new dates here once a year.
 */
const SAT_DATES: { date: string; label: string; registerBy?: string }[] = [
  { date: "2026-12-05", label: "December 5, 2026", registerBy: "2026-11-20" },
  { date: "2027-03-06", label: "March 6, 2027", registerBy: "2027-02-19" },
  { date: "2027-05-01", label: "May 1, 2027", registerBy: "2027-04-16" },
  { date: "2027-06-05", label: "June 5, 2027", registerBy: "2027-05-21" },
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
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const fmt = (iso: string, month: "long" | "short") =>
  new Date(utc(iso)).toLocaleDateString("en-US", { month, day: "numeric", timeZone: "UTC" });

/** A confirmed test date a family can plan towards. */
export interface SatOption {
  /** "2026-12-05" */
  iso: string;
  /** "December 5" */
  day: string;
  /** "Dec 5" */
  short: string;
  /** Whole days from today to the test. */
  days: number;
  /** "November 20": the regular registration deadline. */
  registerBy: string;
  /** False once the regular deadline has passed. */
  registrationOpen: boolean;
}

/** Confirmed dates that have not passed, soonest first: the nearest one is always offered. */
export function satOptions(now: Date, limit = 4): SatOption[] {
  const today = utc(now.toISOString().slice(0, 10));
  const out: SatOption[] = [];
  for (const d of SAT_DATES) {
    if (!d.registerBy || utc(d.date) < today) continue;
    out.push({
      iso: d.date,
      day: fmt(d.date, "long"),
      short: fmt(d.date, "short"),
      days: Math.round((utc(d.date) - today) / DAY_MS),
      registerBy: fmt(d.registerBy, "long"),
      registrationOpen: utc(d.registerBy) >= today,
    });
  }
  return out.slice(0, limit);
}
