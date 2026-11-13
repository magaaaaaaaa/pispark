import { describe, expect, it } from "vitest";
import { leadInputSchema } from "@/lib/leads/schema";
import { validInput } from "./fixtures";

const parse = (v: unknown) => leadInputSchema.safeParse(v);

describe("leadInputSchema", () => {
  it("accepts a complete parent booking", () => {
    expect(parse(validInput()).success).toBe(true);
  });

  it("requires a parent email when a student books", () => {
    const r = parse(validInput({ role: "student" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path.join("."))).toContain("parentEmail");
  });

  it("accepts a student booking with a parent email", () => {
    expect(parse(validInput({ role: "student", parentEmail: "dana@example.com" })).success).toBe(true);
  });

  it("trims and lowercases email addresses", () => {
    const r = parse(validInput({ email: " Mom@Example.COM " }));
    expect(r.success && r.data.email).toBe("mom@example.com");
  });

  it("treats empty optional fields from a form as absent", () => {
    const r = parse({ ...validInput(), parentEmail: "", testDate: "", message: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.parentEmail).toBeUndefined();
      expect(r.data.testDate).toBeUndefined();
    }
  });

  it.each([805, 190, 555, 600.5])("rejects score %s", (score) => {
    expect(parse(validInput({ currentScore: score })).success).toBe(false);
  });

  it("rejects an unknown time zone", () => {
    expect(parse(validInput({ timezone: "Mars/Phobos" })).success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    expect(parse(validInput({ website: "http://spam" })).success).toBe(false);
  });

  it("accepts a booking with no slot chosen", () => {
    const r = parse(validInput({ slot: null }));
    expect(r.success && r.data.slot).toBe(null);
  });

  it("rejects a name longer than 80 characters", () => {
    expect(parse(validInput({ contactName: "x".repeat(81) })).success).toBe(false);
  });

  it.each(["Visit http://evil.example now", "www.evil.example", "evil.example/win", "Dana\nReed", "Dana\u0000"])(
    "rejects a name that carries a link or control character: %j",
    (contactName) => {
      expect(parse(validInput({ contactName })).success).toBe(false);
    },
  );

  it.each(["Mary-Jane O'Neil", "José Álvarez Jr.", "Nguyễn Thị"])("accepts the real name %s", (studentName) => {
    expect(parse(validInput({ studentName })).success).toBe(true);
  });

  it("rejects a test date that carries a link", () => {
    expect(parse(validInput({ testDate: "see https://evil.example" })).success).toBe(false);
  });

  it("rejects a blank name", () => {
    expect(parse(validInput({ studentName: "   " })).success).toBe(false);
  });
});
