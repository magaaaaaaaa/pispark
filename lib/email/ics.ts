import { TRIAL_MINUTES } from "@/lib/config";
import type { Lead } from "@/lib/leads/schema";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/\r?\n/g, " ").replace(/,/g, "\\,").replace(/;/g, "\\;");

/** A calendar file for the trial lesson, in UTC so every calendar app converts it itself. */
export function buildIcs(lead: Lead, callUrl: string): string {
  if (!lead.slot) throw new Error("Cannot build a calendar file for a lead with no trial slot");
  const start = new Date(lead.slot);
  const end = new Date(start.getTime() + TRIAL_MINUTES * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PiSpark//Trial lesson//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${lead.id}@pispark.site`,
    `DTSTAMP:${stamp(new Date(lead.createdAt))}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`PiSpark SAT math trial lesson - ${lead.studentName}`)}`,
    `DESCRIPTION:${esc(callUrl ? `Video call: ${callUrl}` : "The video call link will be sent by email.")}`,
    ...(callUrl ? [`LOCATION:${esc(callUrl)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
