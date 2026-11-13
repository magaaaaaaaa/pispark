import {
  CONTACT_EMAIL,
  DISCLAIMER,
  PACK_SIZE,
  PRICE_PER_HOUR_USD,
  TRIAL_MINUTES,
} from "@/lib/config";
import type { Lead } from "@/lib/leads/schema";

export type Email = { subject: string; html: string; text: string };

const OWNER_TZ = "Asia/Almaty";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "Monday, March 15, 2027 at 8:00 PM EDT" */
export function formatLocal(slotIso: string, timezone: string): string {
  const d = new Date(slotIso);
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
  return `${date} at ${time}`;
}

/** Only links we put there ourselves become clickable; text typed by a visitor never does. */
function linkify(escaped: string, ownLinks: string[]): string {
  let out = escaped;
  for (const link of ownLinks) {
    if (!link) continue;
    const e = escapeHtml(link);
    out = out.split(e).join(`<a href="${e}">${e}</a>`);
  }
  return out;
}

/** Build both bodies from plain-text paragraphs so they can never drift apart. */
function compose(subject: string, paragraphs: string[], footer: boolean, ownLinks: string[] = []): Email {
  const all = footer
    ? [...paragraphs, `PiSpark · ${CONTACT_EMAIL}\n${DISCLAIMER}`]
    : paragraphs;
  const text = all.join("\n\n");
  const body = all
    .map((p) => `<p>${linkify(escapeHtml(p), ownLinks).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
  return {
    subject,
    text,
    html: `<div style="font-family:sans-serif;font-size:16px;line-height:1.5;color:#1a1a2e">${body}</div>`,
  };
}

function callLine(callUrl: string): string {
  return callUrl
    ? `Join the video call here: ${callUrl}`
    : "We will send the video call link by email before the lesson.";
}

export function confirmationEmail(lead: Lead, callUrl: string): Email {
  if (!lead.slot) {
    return compose(
      `We got your request, ${lead.contactName}`,
      [
        `Hi ${lead.contactName},`,
        `Thanks for asking about SAT math lessons for ${lead.studentName}. None of the listed times worked for you, so we will write to you within 24 hours to find one that does.`,
        `If it is easier, reply to this email with a few times that suit you and your time zone.`,
      ],
      true,
    );
  }
  return compose(
    `Your free SAT math trial is booked`,
    [
      `Hi ${lead.contactName},`,
      `The free ${TRIAL_MINUTES}-minute trial lesson for ${lead.studentName} is booked for ${formatLocal(lead.slot, lead.timezone)}.`,
      callLine(callUrl),
      `What to have ready: a quiet place, a laptop or tablet with a camera, and paper and pen. If ${lead.studentName} has a recent SAT or PSAT score report, keep it nearby.`,
      `A calendar invitation is attached. If you need a different time, reply to this email at least 12 hours before the lesson.`,
    ],
    true,
    [callUrl],
  );
}

export function ownerNotificationEmail(lead: Lead, siteUrl: string): Email {
  const when = lead.slot
    ? `${formatLocal(lead.slot, OWNER_TZ)} (your time)`
    : "NO SLOT CHOSEN - write to them within 24 hours";
  const source = [
    lead.source.utmSource,
    lead.source.utmMedium,
    lead.source.utmCampaign,
    lead.source.utmContent,
  ]
    .filter(Boolean)
    .join(" / ");
  const details = [
    `Student: ${lead.studentName}`,
    `Booked by: ${lead.contactName} (${lead.role})`,
    `Email: ${lead.email}`,
    lead.parentEmail ? `Parent email: ${lead.parentEmail}` : null,
    `Grade: ${lead.grade}`,
    `Test date: ${lead.testDate ?? "not given"}`,
    `Current math score: ${lead.currentScore ?? "not given"}`,
    `Target math score: ${lead.targetScore ?? "not given"}`,
    `Their time zone: ${lead.timezone}`,
    `Source: ${source || "direct"}`,
  ].filter(Boolean);
  return compose(
    `New trial lead: ${lead.studentName}`,
    [
      `Trial: ${when}`,
      details.join("\n"),
      lead.message ? `Message: ${lead.message}` : "No message.",
      `Open the lead: ${siteUrl}/owner/leads/${lead.id}`,
    ],
    false,
    [`${siteUrl}/owner/leads/${lead.id}`],
  );
}

export function reminderEmail(lead: Lead, callUrl: string, kind: "day" | "hour"): Email {
  if (!lead.slot) throw new Error("Cannot remind a lead with no trial slot");
  const subject =
    kind === "day"
      ? `Reminder: SAT math trial tomorrow for ${lead.studentName}`
      : `Starting in 1 hour: SAT math trial for ${lead.studentName}`;
  return compose(
    subject,
    [
      `Hi ${lead.contactName},`,
      `A reminder that the free ${TRIAL_MINUTES}-minute trial lesson for ${lead.studentName} is on ${formatLocal(lead.slot, lead.timezone)}.`,
      callLine(callUrl),
      `If something has come up, reply to this email and we will find another time.`,
    ],
    true,
    [callUrl],
  );
}

export function offerEmail(lead: Lead, notes: string, siteUrl: string): Email {
  return compose(
    `${lead.studentName}'s SAT math plan`,
    [
      `Hi ${lead.contactName},`,
      `Thank you for the trial lesson with ${lead.studentName}. Here is what I saw and what I suggest:`,
      notes.trim(),
      `Lessons are 1-on-1 and live, at the $${PRICE_PER_HOUR_USD}/hour founding-student rate. They are booked in packs of ${PACK_SIZE} lessons ($${PRICE_PER_HOUR_USD * PACK_SIZE} per pack), usually one or two lessons a week.`,
      `To start, reply to this email with the days and times that suit ${lead.studentName}, and I will send the schedule and an invoice.`,
      `More about how lessons work: ${siteUrl}`,
    ],
    true,
    [siteUrl],
  );
}
