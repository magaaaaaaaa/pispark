import type { Lead, LeadInput } from "@/lib/leads/schema";

export function validInput(over: Partial<LeadInput> = {}): LeadInput {
  return {
    role: "parent",
    contactName: "Dana Reed",
    studentName: "Alex Reed",
    email: "dana@example.com",
    grade: "11",
    testDate: "March 2027",
    currentScore: 560,
    targetScore: 700,
    timezone: "America/New_York",
    slot: "2027-03-16T00:00:00.000Z",
    message: "Struggles with quadratics",
    source: { utmSource: "instagram", utmMedium: "bio" },
    website: "",
    ...over,
  };
}

export function lead(over: Partial<Lead> = {}): Lead {
  const rest: Omit<LeadInput, "website"> & { website?: string } = validInput();
  delete rest.website;
  return {
    ...rest,
    id: "11111111-2222-3333-4444-555555555555",
    stage: "trial_booked",
    ownerNotes: null,
    emailError: null,
    createdAt: "2027-03-01T10:00:00.000Z",
    ...over,
  };
}
