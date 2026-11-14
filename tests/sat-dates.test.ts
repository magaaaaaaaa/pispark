import { describe, expect, it } from "vitest";
import { prepTarget, upcomingSatDates } from "@/lib/sat-dates";

describe("upcomingSatDates", () => {
  it("lists the confirmed dates with the day, soonest first", () => {
    const d = upcomingSatDates(new Date("2026-11-14T00:00:00Z"));
    expect(d.slice(0, 4)).toEqual(["December 5, 2026", "March 6, 2027", "May 1, 2027", "June 5, 2027"]);
  });
  it("lists dates College Board has only anticipated by month, without a day", () => {
    const d = upcomingSatDates(new Date("2026-11-14T00:00:00Z"));
    expect(d).toContain("August 2027");
    expect(d.find((x) => /^October/.test(x))).toBe("October 2027");
  });
  it("drops a test date once it has passed", () => {
    const d = upcomingSatDates(new Date("2026-12-06T12:00:00Z"));
    expect(d).not.toContain("December 5, 2026");
    expect(d[0]).toBe("March 6, 2027");
  });
  it("still offers the test happening today", () => {
    expect(upcomingSatDates(new Date("2026-12-05T08:00:00Z"))[0]).toBe("December 5, 2026");
  });
  it("offers nothing dated once the list has run out", () => {
    expect(upcomingSatDates(new Date("2029-01-01T00:00:00Z"))).toEqual([]);
  });
});

describe("prepTarget", () => {
  it("skips a test that is too close and counts whole weeks to the next one", () => {
    expect(prepTarget(new Date("2026-11-15T12:00:00Z"))).toEqual({
      label: "March 6, 2027",
      registerBy: "February 19",
      weeks: 15,
      practiceTests: 3,
    });
  });
  it("keeps a test that is exactly eight weeks away", () => {
    expect(prepTarget(new Date("2027-01-09T00:00:00Z"))?.label).toBe("March 6, 2027");
    expect(prepTarget(new Date("2027-01-09T00:00:01Z"))?.label).toBe("May 1, 2027");
  });
  it("gives nothing once only anticipated dates are left", () => {
    expect(prepTarget(new Date("2027-05-01T00:00:00Z"))).toBeNull();
  });
});
