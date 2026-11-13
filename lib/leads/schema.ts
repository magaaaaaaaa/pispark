import { z } from "zod";
import type { Stage } from "@/lib/config";

const blankToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const name = z.string().trim().min(1, "Required").max(80);
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));
const score = z
  .number()
  .int()
  .min(200)
  .max(800)
  .refine((n) => n % 10 === 0, "SAT section scores are multiples of 10");
const utm = z.preprocess(blankToUndefined, z.string().max(100).optional());

function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const leadInputSchema = z
  .object({
    role: z.enum(["parent", "student"]),
    contactName: name,
    studentName: name,
    email,
    parentEmail: z.preprocess(blankToUndefined, email.optional()),
    grade: z.enum(["9", "10", "11", "12", "other"]),
    testDate: z.preprocess(blankToUndefined, z.string().trim().max(40).optional()),
    currentScore: z.preprocess((v) => (v === null ? undefined : v), score.optional()),
    targetScore: z.preprocess((v) => (v === null ? undefined : v), score.optional()),
    timezone: z.string().min(1).max(64).refine(isTimeZone, "Unknown time zone"),
    slot: z.string().max(40).nullable(),
    message: z.preprocess(blankToUndefined, z.string().trim().max(1000).optional()),
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
        message: "A parent's email is required when a student books",
      });
    }
  });

export interface LeadInput {
  role: "parent" | "student";
  contactName: string;
  studentName: string;
  email: string;
  parentEmail?: string;
  grade: "9" | "10" | "11" | "12" | "other";
  testDate?: string;
  currentScore?: number;
  targetScore?: number;
  timezone: string;
  /** UTC ISO start of the trial; null means "none of these times work". */
  slot: string | null;
  message?: string;
  source: { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string };
  /** Honeypot. Must be empty. */
  website: string;
}

export interface Lead extends Omit<LeadInput, "website"> {
  id: string;
  stage: Stage;
  ownerNotes: string | null;
  emailError: string | null;
  createdAt: string;
}
