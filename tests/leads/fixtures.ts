import type { CaptureInput, Lead } from "@/lib/leads/schema";

export function captureInput(over: Partial<CaptureInput> = {}): CaptureInput {
  return {
    role: "parent",
    firstName: "Dana",
    email: "dana@example.com",
    timezone: "America/New_York",
    source: { utmSource: "instagram", utmMedium: "bio" },
    website: "",
    ...over,
  };
}

export function lead(over: Partial<Lead> = {}): Lead {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    stage: "new",
    role: "parent",
    contactName: "Dana",
    email: "dana@example.com",
    timezone: "America/New_York",
    slot: null,
    source: { utmSource: "instagram", utmMedium: "bio" },
    ownerNotes: null,
    emailError: null,
    reminderIds: [],
    followupsSent: 0,
    unsubscribedAt: null,
    flagged: null,
    createdAt: "2027-03-01T10:00:00.000Z",
    ...over,
  };
}

/** A lead who has picked the 16 March slot and filled in the optional details. */
export function bookedLead(over: Partial<Lead> = {}): Lead {
  return lead({
    stage: "trial_booked",
    slot: "2027-03-16T00:00:00.000Z",
    studentName: "Alex",
    grade: "11",
    testDate: "March 2027",
    currentScore: 560,
    targetScore: 700,
    ...over,
  });
}
