import { describe, expect, it } from "vitest";
import { buildIcs } from "@/lib/email/ics";
import { lead } from "../leads/fixtures";

describe("buildIcs", () => {
  const ics = buildIcs(lead(), "https://meet.example.com/pispark");

  it("describes a 25-minute event in UTC", () => {
    expect(ics).toContain("DTSTART:20270316T000000Z");
    expect(ics).toContain("DTEND:20270316T002500Z");
  });
  it("uses CRLF line endings throughout", () => {
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  it("includes the call link", () => {
    expect(ics).toContain("https://meet.example.com/pispark");
  });
  it("escapes commas, semicolons and newlines in the student's name", () => {
    const tricky = buildIcs(lead({ studentName: "Reed, Alex; Jr\nX" }), "");
    expect(tricky).toContain("Reed\\, Alex\\; Jr X");
  });
  it("refuses a lead with no slot", () => {
    expect(() => buildIcs(lead({ slot: null }), "")).toThrow();
  });
});
