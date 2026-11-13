import { beforeEach, describe, expect, it, vi } from "vitest";
import { validInput } from "./fixtures";

type Result = { data?: unknown; error?: unknown; count?: number | null };
const calls: { method: string; args: unknown[] }[] = [];
let result: Result = { data: null, error: null };

function builder(): unknown {
  const b: Record<string, unknown> = {};
  const chain = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args });
    return b;
  };
  for (const m of ["from", "insert", "select", "update", "eq", "gt", "gte", "not", "order", "limit", "single", "maybeSingle"]) {
    b[m] = chain(m);
  }
  b.then = (resolve: (r: Result) => unknown) => Promise.resolve(result).then(resolve);
  return b;
}

vi.mock("@supabase/supabase-js", () => ({ createClient: () => builder() }));

import * as repo from "@/lib/leads/repo";

const row = {
  id: "11111111-2222-3333-4444-555555555555",
  created_at: "2027-03-01T10:00:00+00:00",
  stage: "trial_booked",
  role: "parent",
  contact_name: "Dana Reed",
  student_name: "Alex Reed",
  email: "dana@example.com",
  parent_email: null,
  grade: "11",
  test_date: "March 2027",
  current_score: 560,
  target_score: 700,
  timezone: "America/New_York",
  trial_at: "2027-03-16T00:00:00+00:00",
  message: null,
  utm_source: "instagram",
  utm_medium: "bio",
  utm_campaign: null,
  utm_content: null,
  owner_notes: null,
  email_error: null,
  reminder_ids: ["rem_1"],
  ip: "1.2.3.4",
};

const inserted = () => calls.find((c) => c.method === "insert")!.args[0] as Record<string, unknown>;

beforeEach(() => {
  calls.length = 0;
  result = { data: row, error: null };
  process.env.SUPABASE_URL = "https://x.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "key";
});

describe("createLead", () => {
  it("stores a booking with a slot as trial_booked, in snake_case columns", async () => {
    await repo.createLead(validInput(), "1.2.3.4");
    expect(inserted()).toMatchObject({
      stage: "trial_booked",
      contact_name: "Dana Reed",
      student_name: "Alex Reed",
      trial_at: "2027-03-16T00:00:00.000Z",
      utm_source: "instagram",
      current_score: 560,
      ip: "1.2.3.4",
    });
  });

  it("never stores the honeypot field", async () => {
    await repo.createLead(validInput(), null);
    expect(inserted()).not.toHaveProperty("website");
  });

  it("stores a booking without a slot as new", async () => {
    await repo.createLead(validInput({ slot: null }), null);
    expect(inserted()).toMatchObject({ stage: "new", trial_at: null });
  });

  it("returns the lead with camelCase fields and a normalised slot", async () => {
    const lead = await repo.createLead(validInput(), null);
    expect(lead).toMatchObject({
      id: row.id,
      stage: "trial_booked",
      contactName: "Dana Reed",
      slot: "2027-03-16T00:00:00.000Z",
      source: { utmSource: "instagram", utmMedium: "bio" },
      ownerNotes: null,
    });
    expect(lead.parentEmail).toBeUndefined();
  });

  it("reports a taken slot as SlotTakenError", async () => {
    result = { data: null, error: { code: "23505", message: "duplicate key" } };
    await expect(repo.createLead(validInput(), null)).rejects.toBeInstanceOf(repo.SlotTakenError);
  });

  it("rethrows any other database error", async () => {
    result = { data: null, error: { code: "08006", message: "connection failure" } };
    const p = repo.createLead(validInput(), null);
    await expect(p).rejects.toThrow("connection failure");
    await expect(p).rejects.not.toBeInstanceOf(repo.SlotTakenError);
  });
});

describe("reminders", () => {
  it("reads stored reminder ids, treating a missing column value as none", async () => {
    expect((await repo.createLead(validInput(), null)).reminderIds).toEqual(["rem_1"]);
    result = { data: { ...row, reminder_ids: null }, error: null };
    expect((await repo.createLead(validInput(), null)).reminderIds).toEqual([]);
  });
  it("stores reminder ids on the lead", async () => {
    await repo.saveReminderIds(row.id, ["a", "b"]);
    expect(calls).toContainEqual({ method: "update", args: [{ reminder_ids: ["a", "b"] }] });
  });
});

describe("owner login attempts", () => {
  it("counts recent failures for an address", async () => {
    result = { count: 4, error: null };
    expect(await repo.countRecentLoginFailures("1.2.3.4", new Date())).toBe(4);
    expect(calls[0]).toEqual({ method: "from", args: ["owner_login_failures"] });
  });
  it("records a failure", async () => {
    result = { data: null, error: null };
    await repo.recordLoginFailure("1.2.3.4");
    expect(calls).toContainEqual({ method: "insert", args: [{ ip: "1.2.3.4" }] });
  });
});

describe("bookedSlots", () => {
  it("returns normalised ISO strings and ignores freed slots", async () => {
    result = { data: [{ trial_at: "2027-03-16T00:00:00+00:00" }], error: null };
    expect(await repo.bookedSlots(new Date("2027-03-01T00:00:00Z"))).toEqual(["2027-03-16T00:00:00.000Z"]);
    expect(calls).toContainEqual({ method: "not", args: ["stage", "in", "(lost,not_now)"] });
  });
});

describe("getLead", () => {
  it("returns null for an id that is not a uuid, without querying", async () => {
    expect(await repo.getLead("../etc")).toBeNull();
    expect(calls).toHaveLength(0);
  });
});

describe("countRecentByIp", () => {
  it("returns the count from the database", async () => {
    result = { count: 3, error: null };
    expect(await repo.countRecentByIp("1.2.3.4", new Date())).toBe(3);
  });
});

describe("configuration", () => {
  it("fails with a clear message when the database is not configured", async () => {
    delete process.env.SUPABASE_URL;
    await expect(repo.listLeads()).rejects.toThrow(/SUPABASE_URL/);
  });
});
