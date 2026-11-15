import { describe, expect, it } from "vitest";
import { satOptions, upcomingSatDates } from "@/lib/sat-dates";

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

describe("satOptions", () => {
  it("offers the nearest confirmed date first, however close it is", () => {
    const o = satOptions(new Date("2026-11-15T12:00:00Z"));
    expect(o.map((d) => d.short)).toEqual(["Dec 5", "Mar 6", "May 1", "Jun 5"]);
    expect(o[0]).toMatchObject({ day: "December 5", days: 20, registerBy: "November 20", registrationOpen: true });
  });
  it("says when regular registration has closed", () => {
    const o = satOptions(new Date("2026-11-21T00:00:00Z"));
    expect(o[0]).toMatchObject({ short: "Dec 5", days: 14, registrationOpen: false });
  });
  it("keeps the test happening today and drops it the day after", () => {
    expect(satOptions(new Date("2026-12-05T20:00:00Z"))[0]).toMatchObject({ short: "Dec 5", days: 0 });
    expect(satOptions(new Date("2026-12-06T00:00:00Z"))[0].short).toBe("Mar 6");
  });
  it("leaves out dates College Board has only anticipated", () => {
    expect(satOptions(new Date("2027-06-06T00:00:00Z"))).toEqual([]);
  });
});
