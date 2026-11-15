import { describe, expect, it } from "vitest";
import { PLANS } from "@/lib/config";
import { prepPlan } from "@/lib/prep";

describe("prepPlan", () => {
  it("gives a student three weeks out a real plan", () => {
    const p = prepPlan(20);
    expect(p).toMatchObject({ plan: "Twice a week", perWeek: 2, lessons: 5, practiceTests: 0 });
    expect(p.enoughFor).toMatch(/pacing plan/);
  });
  it("still has something for a test days away", () => {
    expect(prepPlan(5)).toMatchObject({ plan: "Twice a week", lessons: 1 });
    expect(prepPlan(0).lessons).toBe(0);
  });
  it("moves to the Sprint at eight weeks and to Weekly at twelve", () => {
    expect(prepPlan(55).plan).toBe("Twice a week");
    expect(prepPlan(56)).toMatchObject({ plan: "Test Sprint", lessons: 16, practiceTests: 2 });
    expect(prepPlan(83).plan).toBe("Test Sprint");
    expect(prepPlan(84)).toMatchObject({ plan: "Weekly", perWeek: 1, lessons: 12, practiceTests: 3 });
  });
  it("only ever names a plan that is for sale", () => {
    const names = PLANS.map((p) => p.name);
    for (const d of [0, 10, 30, 60, 100, 300]) expect(names).toContain(prepPlan(d).plan);
  });
});
