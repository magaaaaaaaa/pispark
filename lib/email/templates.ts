import {
  CONTACT_EMAIL,
  DISCLAIMER,
  FOUNDING_FAMILIES,
  FROM_PRICE_USD,
  LESSON_MINUTES,
  PLANS,
  POSTAL_ADDRESS,
  planPrice,
  TRIAL_MINUTES,
} from "@/lib/config";
import type { Lead } from "@/lib/leads/schema";

export type Email = { subject: string; html: string; text: string };

/** Links we put into emails to a family. */
export interface FamilyLinks {
  /** Page with every available time. */
  pickUrl: string;
  unsubscribeUrl: string;
  /** One-tap times, already formatted in the family's time zone. */
  suggestions: { label: string; url: string }[];
}

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

/** "Monday, March 15 at 8:00 PM EDT" — for buttons, where the year is noise. */
export function formatShort(slotIso: string, timezone: string): string {
  return formatLocal(slotIso, timezone).replace(/, \d{4} at /, " at ");
}

/** Only links we put there ourselves become clickable; text typed by a person never does. */
function linkify(escaped: string, ownLinks: string[]): string {
  // Longest first, so a link that extends another is not cut in two.
  const sorted = [...new Set(ownLinks.filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!sorted.length) return escaped;
  const pattern = new RegExp(
    sorted.map((l) => escapeHtml(l).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
    "g",
  );
  return escaped.replace(pattern, (m) => `<a href="${m}">${m}</a>`);
}

type Footer = "none" | "family" | "marketing";

/** Build both bodies from plain-text paragraphs so they can never drift apart. */
function compose(
  subject: string,
  paragraphs: string[],
  footer: Footer,
  ownLinks: string[] = [],
  unsubscribeUrl?: string,
): Email {
  const all = [...paragraphs];
  if (footer !== "none") all.push(`PiSpark · ${CONTACT_EMAIL}\n${DISCLAIMER}`);
  if (footer === "marketing") {
    all.push(
      `${POSTAL_ADDRESS}\nYou are getting this because you asked about a free SAT math trial lesson. Stop these emails: ${unsubscribeUrl}`,
    );
  }
  const links = unsubscribeUrl ? [...ownLinks, unsubscribeUrl] : ownLinks;
  const text = all.join("\n\n");
  const body = all
    .map((p) => `<p>${linkify(escapeHtml(p), links).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
  return {
    subject,
    text,
    html: `<div style="font-family:sans-serif;font-size:16px;line-height:1.5;color:#14213d">${body}</div>`,
  };
}

function callLine(callUrl: string): string {
  return callUrl
    ? `Join the video call here: ${callUrl}`
    : "We will send the video call link by email before the lesson.";
}

function suggestionLines(links: FamilyLinks): string | null {
  if (!links.suggestions.length) return null;
  return links.suggestions.map((s) => `${s.label}: ${s.url}`).join("\n");
}

const linkList = (links: FamilyLinks) => [links.pickUrl, ...links.suggestions.map((s) => s.url)];

/** Sent the moment a lead is saved. Its one job is to get a time picked. */
export function instantReplyEmail(lead: Lead, links: FamilyLinks): Email {
  const times = suggestionLines(links);
  return compose(
    `${lead.contactName}, pick a time for your free SAT math trial`,
    [
      `Hi ${lead.contactName},`,
      `Thanks for asking about PiSpark. Your free ${TRIAL_MINUTES}-minute SAT math trial lesson is ready to book. It is 1-on-1, on a video call, and there is nothing to pay.`,
      ...(times ? [`Tap a time that suits you (shown in your time zone):\n${times}`] : []),
      `${times ? "See every available time" : "Pick a time"}: ${links.pickUrl}`,
      `None of them work? Just reply to this email with a couple of times that do, and we will sort it out.`,
    ],
    "marketing",
    linkList(links),
    links.unsubscribeUrl,
  );
}

const FOLLOW_UPS: { subject: (n: string) => string; body: (n: string) => string[] }[] = [
  {
    subject: (n) => `${n}, your free SAT math trial is still open`,
    body: () => [
      `Just checking this did not get buried. Your free ${TRIAL_MINUTES}-minute trial lesson is still waiting for a time.`,
    ],
  },
  {
    subject: () => `What happens in the 25 minutes`,
    body: () => [
      `In case it helps to know what the trial lesson actually is:`,
      `We work through a handful of SAT math questions together, live. By the end you know which topics are solid and which are costing points, and you get a short written plan by email. That is it. No sales call.`,
    ],
  },
  {
    subject: () => `A 30-second SAT math trick`,
    body: () => [
      `One thing we teach in the first lesson: on the digital SAT, the built-in Desmos calculator can solve most "where do these two lines meet" questions for you. Type both equations, tap where the lines cross, read off the answer. Many students never open it.`,
      `There are a dozen more like that, and the trial lesson is where we find out which ones your student needs.`,
    ],
  },
  {
    subject: () => `How our plans work, and why they cost less`,
    body: () => [
      `After the free lesson, a student gets a fixed weekly time with the same teacher, homework between lessons, a practice test every 4 weeks and a progress report for the parent. Plans start at $${FROM_PRICE_USD} per 4 weeks, and you can cancel any time.`,
      `That is less than most SAT tutors charge because we are a small online school based in Kazakhstan, and we are new: our first ${FOUNDING_FAMILIES} families keep the founding price for as long as they stay.`,
      `The trial lesson is free either way, and you decide afterwards.`,
    ],
  },
  {
    subject: (n) => `Last note from us, ${n}`,
    body: () => [
      `This is the last email about the free trial lesson. We do not want to crowd your inbox.`,
      `The offer does not expire. Whenever SAT math prep moves up the list, the link below still works, and a reply to this email reaches a person.`,
    ],
  },
];

export const FOLLOWUP_COUNT = FOLLOW_UPS.length;

/** Nudge number `n` (0-based) for a lead who has not picked a time yet. */
export function followUpEmail(lead: Lead, n: number, links: FamilyLinks): Email {
  const f = FOLLOW_UPS[n];
  if (!f) throw new Error(`There is no follow-up number ${n}`);
  return compose(
    f.subject(lead.contactName),
    [
      `Hi ${lead.contactName},`,
      ...f.body(lead.contactName),
      `Pick a time here: ${links.pickUrl}`,
      `Or reply with a time that suits you.`,
    ],
    "marketing",
    [links.pickUrl],
    links.unsubscribeUrl,
  );
}

export function confirmationEmail(lead: Lead, callUrl: string, pickUrl: string): Email {
  if (!lead.slot) throw new Error("Cannot confirm a lead with no trial time");
  return compose(
    `Your free SAT math trial is booked`,
    [
      `Hi ${lead.contactName},`,
      `Your free ${TRIAL_MINUTES}-minute SAT math trial lesson is booked for ${formatLocal(lead.slot, lead.timezone)}.`,
      callLine(callUrl),
      `What to have ready: a quiet place, a laptop or tablet with a camera, and paper and pen. A recent SAT or PSAT score report helps if there is one.`,
      `A calendar invitation is attached. Need a different time? Change it here: ${pickUrl}`,
    ],
    "family",
    [callUrl, pickUrl],
  );
}

function sourceOf(lead: Lead): string {
  return (
    [lead.source.utmSource, lead.source.utmMedium, lead.source.utmCampaign, lead.source.utmContent]
      .filter(Boolean)
      .join(" / ") || "direct"
  );
}

function detailLines(lead: Lead): string {
  return [
    `Name: ${lead.contactName} (${lead.role})`,
    `Email: ${lead.email}`,
    lead.parentEmail ? `Parent email: ${lead.parentEmail}` : null,
    `Student: ${lead.studentName ?? "not given"}`,
    `Grade: ${lead.grade ?? "not given"}`,
    `Test date: ${lead.testDate ?? "not given"}`,
    `Current math score: ${lead.currentScore ?? "not given"}`,
    `Target math score: ${lead.targetScore ?? "not given"}`,
    `Their time zone: ${lead.timezone}`,
    `Source: ${sourceOf(lead)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** To the owner: someone left their email and has not picked a time yet. */
export function ownerLeadEmail(lead: Lead, siteUrl: string): Email {
  const url = `${siteUrl}/owner/leads/${lead.id}`;
  return compose(
    `New lead: ${lead.contactName}`,
    [
      `${lead.contactName} just asked for a free trial and was sent times to pick from. A fast personal reply to ${lead.email} makes a booking much more likely.`,
      detailLines(lead),
      `Open the lead: ${url}`,
    ],
    "none",
    [url],
  );
}

/** To the owner: a time was picked (or moved). */
export function ownerBookedEmail(lead: Lead, siteUrl: string): Email {
  if (!lead.slot) throw new Error("Lead has no trial time");
  const url = `${siteUrl}/owner/leads/${lead.id}`;
  return compose(
    `Trial booked: ${lead.contactName}, ${formatShort(lead.slot, OWNER_TZ)}`,
    [
      `Trial: ${formatLocal(lead.slot, OWNER_TZ)} (your time)`,
      detailLines(lead),
      lead.message ? `Message: ${lead.message}` : "No message.",
      `Open the lead: ${url}`,
    ],
    "none",
    [url],
  );
}

export function reminderEmail(
  lead: Lead,
  callUrl: string,
  kind: "day" | "hour",
  pickUrl: string,
): Email {
  if (!lead.slot) throw new Error("Cannot remind a lead with no trial time");
  const subject =
    kind === "day"
      ? `Reminder: your SAT math trial is tomorrow`
      : `Starting in 1 hour: your SAT math trial`;
  return compose(
    subject,
    [
      `Hi ${lead.contactName},`,
      `A reminder that your free ${TRIAL_MINUTES}-minute SAT math trial lesson is on ${formatLocal(lead.slot, lead.timezone)}.`,
      callLine(callUrl),
      `Something came up? Move it here: ${pickUrl}`,
    ],
    "family",
    [callUrl, pickUrl],
  );
}

export function offerEmail(lead: Lead, notes: string, siteUrl: string): Email {
  return compose(
    `Your SAT math plan from PiSpark`,
    [
      `Hi ${lead.contactName},`,
      `Thank you for the trial lesson. Here is what we saw and what we suggest:`,
      notes.trim(),
      `Lessons are ${LESSON_MINUTES} minutes, live and 1-on-1, at a fixed time each week. Founding prices:`,
      PLANS.map((p) => `${p.name} (${p.what}): ${planPrice(p)}`).join("\n"),
      `Weekly and Twice a week are paid every 4 weeks and can be cancelled any time before the next payment.`,
      `To start, reply with the plan you want and the days and times that suit you. We will confirm the weekly time and send an invoice.`,
      `More about how lessons work: ${siteUrl}/`,
    ],
    "family",
    [`${siteUrl}/`],
  );
}
