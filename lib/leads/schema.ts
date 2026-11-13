import { z } from "zod";
import type { Stage } from "@/lib/config";

const blankToUndefined = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;

/** Short free text that ends up in email subjects: no links, no control characters. */
const plainLine = (v: string) =>
  !/[\u0000-\u001f\u007f]/.test(v) && !/(:\/\/|www\.|\.[a-z]{2,}\/)/i.test(v);
const name = z
  .string()
  .trim()
  .min(1, "Required")
  .max(80)
  .refine(plainLine, "Use a plain name, without links");
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));
const score = z
  .number()
  .int()
  .min(200)
  .max(800)
  .refine((n) => n % 10 === 0, "SAT section scores are multiples of 10");
const utm = z.preprocess(blankToUndefined, z.string().max(100).optional());
const optional = <T extends z.ZodType>(t: T) => z.preprocess(blankToUndefined, t.optional());

export const DEFAULT_TIMEZONE = "America/New_York";

export function isTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz === "Etc/Unknown") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Step one of the funnel: the least we need to never lose the lead. */
export const captureInputSchema = z
  .object({
    role: z.enum(["parent", "student"]).default("parent"),
    firstName: name,
    email,
    parentEmail: optional(email),
    // A browser can report a zone this server does not know; that must never block a sign-up.
    timezone: z.preprocess((v) => (isTimeZone(v) ? v : DEFAULT_TIMEZONE), z.string()),
    source: z
      .object({ utmSource: utm, utmMedium: utm, utmCampaign: utm, utmContent: utm })
      .default({}),
    website: z.string().max(0, "Leave this field empty"),
  })
  .superRefine((v, ctx) => {
    if (v.role === "student" && !v.parentEmail) {
      ctx.addIssue({
        code: "custom",
        path: ["parentEmail"],
        message: "Add a parent's email so we can copy them in",
      });
    }
    if (v.parentEmail && v.parentEmail === v.email) {
      ctx.addIssue({
        code: "custom",
        path: ["parentEmail"],
        message: "Use a parent's email here, not your own",
      });
    }
  });

/** Optional extras, asked only after the lead is saved. */
export const detailsInputSchema = z.object({
  studentName: optional(name),
  grade: optional(z.enum(["9", "10", "11", "12", "other"])),
  testDate: optional(z.string().trim().max(40).refine(plainLine, "Use plain text, without links")),
  currentScore: optional(score),
  targetScore: optional(score),
  message: optional(z.string().trim().max(1000)),
});

export type Source = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
};

export interface CaptureInput {
  role: "parent" | "student";
  firstName: string;
  email: string;
  parentEmail?: string;
  timezone: string;
  source: Source;
  /** Honeypot. Must be empty. */
  website: string;
}

export interface LeadDetails {
  studentName?: string;
  grade?: "9" | "10" | "11" | "12" | "other";
  testDate?: string;
  currentScore?: number;
  targetScore?: number;
  message?: string;
}

export interface Lead extends LeadDetails {
  id: string;
  stage: Stage;
  role: "parent" | "student";
  /** First name of whoever signed up. */
  contactName: string;
  email: string;
  parentEmail?: string;
  timezone: string;
  /** UTC ISO start of the trial; null until a time is picked. */
  slot: string | null;
  source: Source;
  ownerNotes: string | null;
  emailError: string | null;
  /** Ids of scheduled reminder emails that have not been cancelled. */
  reminderIds: string[];
  /** How many follow-up nudges have gone out so far. */
  followupsSent: number;
  unsubscribedAt: string | null;
  /** Why a sign-up was saved without emails ("honeypot", "rate_limited"), or null. */
  flagged: string | null;
  createdAt: string;
}
