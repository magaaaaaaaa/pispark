import { describe, expect, it } from "vitest";
import {
  confirmationEmail,
  formatLocal,
  offerEmail,
  ownerNotificationEmail,
  reminderEmail,
} from "@/lib/email/templates";
import { lead } from "../leads/fixtures";

const CALL = "https://meet.example.com/pispark";
const SITE = "https://pispark.site";
const NOTES = "Alex is strong on linear equations; we will focus on quadratics and data analysis.";

describe("formatLocal", () => {
  it("shows the family's local date and time after the US clock change", () => {
    const s = formatLocal("2027-03-16T00:00:00.000Z", "America/New_York");
    expect(s).toContain("Monday, March 15, 2027");
    expect(s).toContain("8:00 PM");
  });
  it("shows the family's local time before the US clock change", () => {
    expect(formatLocal("2027-03-13T00:00:00.000Z", "America/New_York")).toContain("7:00 PM");
  });
});

describe("confirmationEmail", () => {
  it("tells the family when and where the trial is", () => {
    const e = confirmationEmail(lead(), CALL);
    expect(e.text).toContain("Alex Reed");
    expect(e.text).toContain("Monday, March 15, 2027");
    expect(e.text).toContain("8:00 PM");
    expect(e.text).toContain(CALL);
    expect(e.text).toContain("25-minute");
  });
  it("promises a personal reply instead when no slot was chosen", () => {
    const e = confirmationEmail(lead({ slot: null, stage: "new" }), CALL);
    expect(e.text).toContain("within 24 hours");
    expect(e.text).not.toContain(CALL);
    expect(e.html).not.toContain(CALL);
  });
  it("says the link will follow when no call link is configured", () => {
    const e = confirmationEmail(lead(), "");
    expect(e.text).toContain("send the video call link");
  });
});

describe("ownerNotificationEmail", () => {
  it("gives the owner what they need to prepare", () => {
    const e = ownerNotificationEmail(lead(), SITE);
    expect(e.text).toContain("Grade: 11");
    expect(e.text).toContain("560");
    expect(e.text).toContain("700");
    expect(e.text).toContain("March 2027");
    expect(e.text).toContain("instagram");
    expect(e.text).toContain(`${SITE}/owner/leads/11111111-2222-3333-4444-555555555555`);
  });
  it("shows the trial in owner time", () => {
    // 2027-03-16T00:00Z is 05:00 on Tuesday 16 March in Astana.
    expect(ownerNotificationEmail(lead(), SITE).text).toMatch(/Tuesday, March 16, 2027.*5:00 AM/);
  });
});

describe("reminderEmail", () => {
  it("names the time and the link", () => {
    const e = reminderEmail(lead(), CALL, "hour");
    expect(e.text).toContain("8:00 PM");
    expect(e.text).toContain(CALL);
    expect(e.subject).toMatch(/1 hour/);
    expect(reminderEmail(lead(), CALL, "day").subject).toMatch(/tomorrow/i);
  });
});

describe("offerEmail", () => {
  it("carries the owner's notes and the offer", () => {
    const e = offerEmail(lead(), NOTES, SITE);
    expect(e.text).toContain(NOTES);
    expect(e.text).toContain("$17/hour");
    expect(e.text).toContain("8 lessons");
  });
  it("keeps line breaks from the owner's notes in the html", () => {
    expect(offerEmail(lead(), "First point.\nSecond point.", SITE).html).toContain("First point.<br>Second point.");
  });
});

describe("all emails", () => {
  const evil = lead({ studentName: "<script>alert(1)</script>", contactName: "A & B" });
  const all = [
    confirmationEmail(evil, CALL),
    ownerNotificationEmail(evil, SITE),
    reminderEmail(evil, CALL, "day"),
    offerEmail(evil, "<b>notes</b> that are long enough", SITE),
  ];
  it("escape user-supplied text in html", () => {
    for (const e of all) {
      expect(e.html).not.toContain("<script>");
      expect(e.html).not.toContain("<b>notes</b>");
    }
    expect(all[0].html).toContain("&lt;script&gt;");
  });
  it("do not turn a link typed by a visitor into a clickable link", () => {
    const spam = lead({ message: "Win big at https://evil.example/win now" });
    const e = ownerNotificationEmail(spam, SITE);
    expect(e.html).toContain("https://evil.example/win");
    expect(e.html).not.toContain('href="https://evil.example');
    expect(offerEmail(lead(), "Read https://evil.example/notes before the lesson please", SITE).html).not.toContain(
      'href="https://evil.example',
    );
  });
  it("make our own links clickable", () => {
    expect(confirmationEmail(lead(), CALL).html).toContain(`href="${CALL}"`);
    expect(ownerNotificationEmail(lead(), SITE).html).toContain(`href="${SITE}/owner/leads/`);
  });
  it("never promise a result", () => {
    for (const e of all) expect(`${e.subject} ${e.text} ${e.html}`.toLowerCase()).not.toContain("guarantee");
  });
  it("carry the College Board disclaimer when sent to families", () => {
    for (const e of [all[0], all[2], all[3]]) expect(e.text).toContain("not affiliated with PiSpark");
  });
});
