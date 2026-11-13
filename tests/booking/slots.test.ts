import { describe, expect, it } from "vitest";
import { generateSlots, isValidSlot } from "@/lib/booking/slots";

// Monday 2026-11-16, 05:00 in owner time (UTC+5).
const MON = new Date("2026-11-16T00:00:00Z");
const H = 3_600_000;

describe("generateSlots", () => {
  const slots = generateSlots(MON, []);

  it("starts at the first window after the 12-hour lead time", () => {
    expect(slots[0]).toBe("2026-11-17T00:00:00.000Z");
  });

  it("offers nothing on Monday evening, which has no window", () => {
    expect(slots).not.toContain("2026-11-16T14:00:00.000Z");
  });

  it("offers ten half-hour slots in a weekday morning window", () => {
    const tue = slots.filter((s) => s.startsWith("2026-11-17T0"));
    expect(tue).toHaveLength(10);
    expect(tue[9]).toBe("2026-11-17T04:30:00.000Z");
  });

  it("offers a morning and an evening window on Saturday", () => {
    const sat = slots.filter((s) => s.startsWith("2026-11-21"));
    expect(sat).toHaveLength(18);
    expect(sat[17]).toBe("2026-11-21T17:30:00.000Z");
  });

  it("stays between 12 hours and 14 days from now", () => {
    for (const s of slots) {
      const t = new Date(s).getTime();
      expect(t).toBeGreaterThanOrEqual(MON.getTime() + 12 * H);
      expect(t).toBeLessThanOrEqual(MON.getTime() + 14 * 24 * H);
    }
  });

  it("is sorted ascending", () => {
    expect([...slots].sort()).toEqual(slots);
  });

  it("omits a booked slot and keeps its neighbours", () => {
    const free = generateSlots(MON, ["2026-11-17T00:30:00.000Z"]);
    expect(free).not.toContain("2026-11-17T00:30:00.000Z");
    expect(free).toContain("2026-11-17T00:00:00.000Z");
    expect(free).toContain("2026-11-17T01:00:00.000Z");
  });

  it("omits a booked slot given in a different ISO spelling", () => {
    const free = generateSlots(MON, ["2026-11-17T00:30:00+00:00"]);
    expect(free).not.toContain("2026-11-17T00:30:00.000Z");
  });

  it("keeps the same instants across the US daylight-saving change", () => {
    const s = generateSlots(new Date("2027-03-10T00:00:00Z"), []);
    expect(s).toContain("2027-03-13T00:00:00.000Z");
    expect(s).toContain("2027-03-16T00:00:00.000Z");
    const ny = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
    });
    expect(ny.format(new Date("2027-03-13T00:00:00.000Z"))).toBe("7:00 PM");
    expect(ny.format(new Date("2027-03-16T00:00:00.000Z"))).toBe("8:00 PM");
  });
});

describe("isValidSlot", () => {
  it("accepts a generated slot", () => {
    expect(isValidSlot("2026-11-17T00:00:00.000Z", MON)).toBe(true);
  });
  it("rejects a past slot", () => {
    expect(isValidSlot("2026-11-10T00:00:00.000Z", MON)).toBe(false);
  });
  it("rejects a slot inside the 12-hour lead time", () => {
    expect(isValidSlot("2026-11-17T00:00:00.000Z", new Date("2026-11-16T13:00:00Z"))).toBe(false);
  });
  it("rejects an off-grid time", () => {
    expect(isValidSlot("2026-11-17T00:10:00.000Z", MON)).toBe(false);
  });
  it("rejects a time outside the windows", () => {
    expect(isValidSlot("2026-11-17T08:00:00.000Z", MON)).toBe(false);
  });
  it("rejects something that is not a date", () => {
    expect(isValidSlot("tomorrow", MON)).toBe(false);
  });
});
