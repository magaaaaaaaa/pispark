import type { Plan } from "@/lib/config";

/** What fits between today and a test date, and which plan suits it. */
export interface PrepPlan {
  /** Name of the plan in PLANS that fits this much time. */
  plan: Plan["name"];
  /** Lessons a week on that plan. */
  perWeek: 1 | 2;
  /** Lessons that fit before the test at that pace. */
  lessons: number;
  /** Full practice tests that fit, at most one every 4 weeks. */
  practiceTests: number;
  /** An honest sentence or two about what this much time can and cannot do. */
  enoughFor: string;
}

const WEEK = 7;

/**
 * Any amount of time is worth using, so there is no minimum: a student three
 * weeks out gets a plan for three weeks, told plainly what it can do.
 */
export function prepPlan(days: number): PrepPlan {
  const weeks = days / WEEK;
  const plan: Plan["name"] = weeks >= 12 ? "Weekly" : weeks >= 8 ? "Test Sprint" : "Twice a week";
  const perWeek = plan === "Weekly" ? 1 : 2;
  // The Sprint is a fixed 16 lessons over the last 8 weeks.
  const lessons = plan === "Test Sprint" ? 16 : Math.max(0, Math.floor((days * perWeek) / WEEK));
  const practiceTests = plan === "Test Sprint" ? 2 : Math.floor(days / 28);

  let enoughFor: string;
  if (weeks < 2) {
    enoughFor =
      "Enough for one thing: the mistakes your student makes most. We find them in the first lesson, drill them, and set a pacing plan for test day. It will not rebuild a topic, and we will say so plainly.";
  } else if (weeks < 4) {
    enoughFor =
      "Enough to fix the two or three mistakes that cost the most, learn the Desmos shortcuts, and walk in with a pacing plan. Not enough to rebuild a weak topic from zero. We will tell you which is which.";
  } else if (weeks < 8) {
    enoughFor =
      "Enough to close one or two weak topics properly and sit a timed practice test with a full review of every miss.";
  } else if (weeks < 12) {
    enoughFor =
      "Enough to cover all four areas of the test once, with two full practice tests reviewed along the way.";
  } else {
    enoughFor =
      "Enough to work through all four areas of the test at one lesson a week, with a practice test every 4 weeks and no cramming.";
  }
  return { plan, perWeek, lessons, practiceTests, enoughFor };
}
