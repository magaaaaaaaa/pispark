/**
 * SAT weekend test dates, from College Board's dates and deadlines page
 * (satsuite.collegeboard.org/sat/dates-deadlines), checked 2026-11-14.
 * Dates College Board lists only as "anticipated" are shown by month, because
 * the exact day can still move. Add new dates here once a year.
 */
const SAT_DATES: { date: string; label: string }[] = [
  { date: "2026-12-05", label: "December 5, 2026" },
  { date: "2027-03-06", label: "March 6, 2027" },
  { date: "2027-05-01", label: "May 1, 2027" },
  { date: "2027-06-05", label: "June 5, 2027" },
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
