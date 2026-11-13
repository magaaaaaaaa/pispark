import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureInput } from "./fixtures";

type Result = { data?: unknown; error?: unknown; count?: number | null };
const calls: { method: string; args: unknown[] }[] = [];
let result: Result = { data: null, error: null };

function builder(): unknown {
  const b: Record<string, unknown> = {};
  const chain = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args });
    return b;
  };
  for (const m of ["from", "insert", "select", "update", "eq", "gt", "gte", "in", "not", "order", "limit", "single", "maybeSingle"]) {
    b[m] = chain(m);
  }
  b.then = (resolve: (r: Result) => unknown) => Promise.resolve(result).then(resolve);
  return b;
}

vi.mock("@supabase/supabase-js", () => ({ createClient: () => builder() }));

import * as repo from "@/lib/leads/repo";

const ID = "11111111-2222-3333-4444-555555555555";
const row = {
  id: ID,
  created_at: "2027-03-01T10:00:00+00:00",
  stage: "new",
  role: "parent",
  contact_name: "Dana",
  student_name: null,
  email: "dana@example.com",
  parent_email: null,
  grade: null,
  test_date: null,
  current_score: null,
  target_score: null,
  timezone: "America/New_York",
  trial_at: null,
  message: null,
  utm_source: "instagram",
  utm_medium: "bio",
  utm_campaign: null,
  utm_content: null,
  owner_notes: null,
  email_error: null,
  reminder_ids: ["rem_1"],
  followup_ids: ["f_1"],
  unsubscribed_at: null,
  ip: "1.2.3.4",
};

const arg = (method: string) => calls.find((c) => c.method === method)!.args[0] as Record<string, unknown>;

beforeEach(() => {
  calls.length = 0;
  result = { data: row, error: null };
  process.env.SUPABASE_URL = "https://x.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "key";
});

describe("createLead", () => {
  it("stores a new lead from a name and an email", async () => {
    await repo.createLead(captureInput(), "1.2.3.4");
    expect(arg("insert")).toEqual({
      stage: "new",
      role: "parent",
      contact_name: "Dana",
      email: "dana@example.com",
      parent_email: null,
      timezone: "America/New_York",
      utm_source: "instagram",
      utm_medium: "bio",
      utm_campaign: null,
      utm_content: null,
      ip: "1.2.3.4",
    });
  });

  it("returns the lead with optional fields absent rather than null", async () => {
    const lead = await repo.createLead(captureInput(), null);
    expect(lead).toMatchObject({
      id: ID,
      stage: "new",
      contactName: "Dana",
      slot: null,
      reminderIds: ["rem_1"],
      followupIds: ["f_1"],
      unsubscribedAt: null,
    });
    expect(lead.studentName).toBeUndefined();
    expect(lead.grade).toBeUndefined();
  });

  it("treats missing id lists as empty", async () => {
    result = { data: { ...row, reminder_ids: null, followup_ids: null }, error: null };
    const lead = await repo.createLead(captureInput(), null);
    expect(lead.reminderIds).toEqual([]);
    expect(lead.followupIds).toEqual([]);
  });

  it("rethrows a database error", async () => {
    result = { data: null, error: { code: "08006", message: "connection failure" } };
    await expect(repo.createLead(captureInput(), null)).rejects.toThrow("connection failure");
  });
});

describe("setTrial", () => {
  it("books the slot and moves the lead to trial_booked", async () => {
    result = { data: { ...row, stage: "trial_booked", trial_at: "2027-03-16T00:00:00+00:00" }, error: null };
    const lead = await repo.setTrial(ID, "2027-03-16T00:00:00.000Z");
    expect(arg("update")).toEqual({ trial_at: "2027-03-16T00:00:00.000Z", stage: "trial_booked" });
    expect(lead).toMatchObject({ stage: "trial_booked", slot: "2027-03-16T00:00:00.000Z" });
  });

  it("reports a slot held by another lead as SlotTakenError", async () => {
    result = { data: null, error: { code: "23505", message: "duplicate key" } };
    await expect(repo.setTrial(ID, "2027-03-16T00:00:00.000Z")).rejects.toBeInstanceOf(repo.SlotTakenError);
  });

  it("refuses an id that is not a uuid", async () => {
    await expect(repo.setTrial("../x", "2027-03-16T00:00:00.000Z")).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
});

describe("findOpenByEmail", () => {
  it("looks only at recent leads that are still in play", async () => {
    result = { data: [row], error: null };
    const since = new Date("2027-02-08T00:00:00Z");
    expect((await repo.findOpenByEmail("dana@example.com", since))?.id).toBe(ID);
    expect(calls).toContainEqual({ method: "in", args: ["stage", ["new", "trial_booked"]] });
    expect(calls).toContainEqual({ method: "gte", args: ["created_at", since.toISOString()] });
  });
  it("returns null when there is none", async () => {
    result = { data: [], error: null };
    expect(await repo.findOpenByEmail("x@example.com", new Date())).toBeNull();
  });
});

describe("saveDetails", () => {
  it("writes only the fields that were given", async () => {
    await repo.saveDetails(ID, { studentName: "Alex", currentScore: 560 });
    expect(arg("update")).toEqual({ student_name: "Alex", current_score: 560 });
  });
  it("does not touch the database when nothing was given", async () => {
    await repo.saveDetails(ID, {});
    expect(calls).toHaveLength(0);
  });
});

describe("id lists and unsubscribe", () => {
  it("stores reminder ids", async () => {
    await repo.saveReminderIds(ID, ["a", "b"]);
    expect(arg("update")).toEqual({ reminder_ids: ["a", "b"] });
  });
  it("stores follow-up ids", async () => {
    await repo.saveFollowupIds(ID, []);
    expect(arg("update")).toEqual({ followup_ids: [] });
  });
  it("marks a lead unsubscribed with a timestamp", async () => {
    await repo.markUnsubscribed(ID);
    expect(String(arg("update").unsubscribed_at)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
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

describe("counters", () => {
  it("counts recent sign-ups from an address", async () => {
    result = { count: 3, error: null };
    expect(await repo.countRecentByIp("1.2.3.4", new Date())).toBe(3);
  });
  it("counts recent failed owner sign-ins for an address", async () => {
    result = { count: 4, error: null };
    expect(await repo.countRecentLoginFailures("1.2.3.4", new Date())).toBe(4);
    expect(calls[0]).toEqual({ method: "from", args: ["owner_login_failures"] });
  });
  it("records a failed owner sign-in", async () => {
    result = { data: null, error: null };
    await repo.recordLoginFailure("1.2.3.4");
    expect(calls).toContainEqual({ method: "insert", args: [{ ip: "1.2.3.4" }] });
  });
});

describe("configuration", () => {
  it("fails with a clear message when the database is not configured", async () => {
    delete process.env.SUPABASE_URL;
    await expect(repo.listLeads()).rejects.toThrow(/SUPABASE_URL/);
  });
});
