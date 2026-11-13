import { describe, expect, it } from "vitest";
import { generateSlots } from "@/lib/booking/slots";
import { suggestSlots } from "@/lib/funnel/suggest";

// Monday 2026-11-16 00:00Z.
const slots = generateSlots(new Date("2026-11-16T00:00:00Z"), []);
const hour = (iso: string, tz: string) =>
  Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date(iso)));
const day = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));

describe("suggestSlots", () => {
  it("offers three times on three different local days", () => {
    const s = suggestSlots(slots, "America/New_York");
    expect(s).toHaveLength(3);
    expect(new Set(s.map((x) => day(x, "America/New_York"))).size).toBe(3);
  });

  it("only suggests times a family is awake for, when such times exist", () => {
    for (const tz of ["America/New_York", "America/Los_Angeles", "America/Chicago"]) {
      for (const s of suggestSlots(slots, tz)) {
        expect(hour(s, tz)).toBeGreaterThanOrEqual(8);
        expect(hour(s, tz)).toBeLessThan(22);
      }
    }
  });

  it("returns them soonest first, and only from the offered slots", () => {
    const s = suggestSlots(slots, "America/New_York");
    expect([...s].sort()).toEqual(s);
    for (const x of s) expect(slots).toContain(x);
  });

  it("falls back to the soonest slots when none are at a friendly hour", () => {
    const late = ["2026-11-17T08:00:00.000Z", "2026-11-17T08:30:00.000Z"]; // 3 AM Eastern
    expect(suggestSlots(late, "America/New_York")).toEqual(late);
  });

  it("returns nothing when there are no slots", () => {
    expect(suggestSlots([], "America/New_York")).toEqual([]);
  });
});
