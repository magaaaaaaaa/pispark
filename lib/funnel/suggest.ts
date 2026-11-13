const localHour = (iso: string, tz: string) =>
  Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(
      new Date(iso),
    ),
  );
const localDay = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));

/**
 * Up to `count` times to offer as one-tap choices: the soonest slot on each of
 * the next few local days, at an hour the family is awake (08:00–22:00 their
 * time). If no slot is at a friendly hour, the soonest slots are offered as-is.
 */
export function suggestSlots(slots: string[], timezone: string, count = 3): string[] {
  const picked: string[] = [];
  const days = new Set<string>();
  for (const s of slots) {
    const h = localHour(s, timezone);
    if (h < 8 || h >= 22) continue;
    const d = localDay(s, timezone);
    if (days.has(d)) continue;
    days.add(d);
    picked.push(s);
    if (picked.length === count) break;
  }
  return picked.length ? picked : slots.slice(0, count);
}
