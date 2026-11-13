import {
  HORIZON_DAYS,
  MIN_LEAD_HOURS,
  OWNER_UTC_OFFSET_MIN,
  SLOT_GRID_MIN,
  WINDOWS,
} from "@/lib/config";

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const OFFSET = OWNER_UTC_OFFSET_MIN * MIN;

/** Free trial slot starts as ascending UTC ISO strings. */
export function generateSlots(now: Date, booked: string[]): string[] {
  const earliest = now.getTime() + MIN_LEAD_HOURS * 60 * MIN;
  const latest = now.getTime() + HORIZON_DAYS * DAY;
  const taken = new Set<number>();
  for (const b of booked) {
    const t = new Date(b).getTime();
    if (!Number.isNaN(t)) taken.add(t);
  }

  // Midnight of "today" in owner time, expressed as a UTC instant.
  const ownerMidnight = Math.floor((now.getTime() + OFFSET) / DAY) * DAY - OFFSET;
  const out: number[] = [];
  for (let d = 0; d <= HORIZON_DAYS + 1; d++) {
    const dayStart = ownerMidnight + d * DAY;
    const weekday = new Date(dayStart + OFFSET).getUTCDay();
    for (const w of WINDOWS) {
      if (!w.days.includes(weekday)) continue;
      for (let m = w.startHour * 60; m < w.endHour * 60; m += SLOT_GRID_MIN) {
        const t = dayStart + m * MIN;
        if (t >= earliest && t <= latest && !taken.has(t)) out.push(t);
      }
    }
  }
  return out.sort((a, b) => a - b).map((t) => new Date(t).toISOString());
}

/** True only for a slot generateSlots(now, []) would offer. */
export function isValidSlot(slot: string, now: Date): boolean {
  const t = new Date(slot).getTime();
  if (Number.isNaN(t)) return false;
  return generateSlots(now, []).includes(new Date(t).toISOString());
}
