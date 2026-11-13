import { describe, expect, it } from "vitest";
import { captureInputSchema, detailsInputSchema } from "@/lib/leads/schema";
import { captureInput } from "./fixtures";

const parse = (v: unknown) => captureInputSchema.safeParse(v);

describe("captureInputSchema", () => {
  it("accepts a first name and an email, nothing else", () => {
    const r = parse({ firstName: "Dana", email: "dana@example.com", timezone: "America/New_York", website: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.role).toBe("parent");
      expect(r.data.source).toEqual({});
    }
  });

  it("falls back to US Eastern when the browser reports no usable time zone", () => {
    const r = parse({ ...captureInput(), timezone: "Etc/Unknown" });
    expect(r.success && r.data.timezone).toBe("America/New_York");
  });

  it("requires a parent email when a student signs up", () => {
    const r = parse(captureInput({ role: "student" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path.join("."))).toContain("parentEmail");
  });

  it("accepts a student with a parent email", () => {
    expect(parse(captureInput({ role: "student", parentEmail: "mom@example.com" })).success).toBe(true);
  });

  it("trims and lowercases the email", () => {
    const r = parse(captureInput({ email: " Mom@Example.COM " }));
    expect(r.success && r.data.email).toBe("mom@example.com");
  });

  it.each(["", "   ", "x".repeat(81), "Visit http://evil.example", "www.evil.example", "Dana\nReed"])(
    "rejects the name %j",
    (firstName) => {
      expect(parse(captureInput({ firstName })).success).toBe(false);
    },
  );

  it.each(["Mary-Jane O'Neil", "José", "Nguyễn Thị"])("accepts the real name %s", (firstName) => {
    expect(parse(captureInput({ firstName })).success).toBe(true);
  });

  it("rejects a bad email", () => {
    expect(parse(captureInput({ email: "nope" })).success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    expect(parse(captureInput({ website: "x" })).success).toBe(false);
  });
});

describe("detailsInputSchema", () => {
  const d = (v: unknown) => detailsInputSchema.safeParse(v);

  it("accepts everything left blank", () => {
    const r = d({ studentName: "", grade: "", testDate: "", message: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toEqual({});
  });

  it("accepts a full set of details", () => {
    const r = d({ studentName: "Alex", grade: "11", testDate: "March 2027", currentScore: 560, targetScore: 700, message: "Quadratics" });
    expect(r.success).toBe(true);
  });

  it.each([805, 190, 555, 600.5])("rejects score %s", (currentScore) => {
    expect(d({ currentScore }).success).toBe(false);
  });

  it("rejects a test date that carries a link", () => {
    expect(d({ testDate: "see https://evil.example" }).success).toBe(false);
  });
});
