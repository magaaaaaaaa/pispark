import { describe, expect, it } from "vitest";
import {
  confirmationEmail,
  followUpEmail,
  formatLocal,
  FOLLOWUP_COUNT,
  instantReplyEmail,
  offerEmail,
  ownerBookedEmail,
  ownerLeadEmail,
  reminderEmail,
} from "@/lib/email/templates";
import { buildIcs } from "@/lib/email/ics";
import { bookedLead, lead } from "../leads/fixtures";

const CALL = "https://meet.example.com/pispark";
const SITE = "https://pispark.site";
const PICK = "https://pispark.site/pick?l=tok";
const UNSUB = "https://pispark.site/unsubscribe?l=tok";
const NOTES = "Strong on linear equations; we will focus on quadratics and data analysis.";
const links = {
  pickUrl: PICK,
  unsubscribeUrl: UNSUB,
  suggestions: [
    { label: "Monday, March 15 at 8:00 PM EDT", url: `${PICK}&slot=a` },
    { label: "Tuesday, March 16 at 8:00 PM EDT", url: `${PICK}&slot=b` },
  ],
};

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

describe("instantReplyEmail", () => {
  const e = instantReplyEmail(lead(), links);
  it("greets by first name and offers each suggested time as its own link", () => {
    expect(e.text).toContain("Hi Dana");
    expect(e.text).toContain("Monday, March 15 at 8:00 PM EDT");
    expect(e.html).toContain(`href="${PICK}&amp;slot=a"`);
    expect(e.html).toContain(`href="${PICK}&amp;slot=b"`);
  });
  it("links to all times and invites a reply instead", () => {
    expect(e.text).toContain(PICK);
    expect(e.text.toLowerCase()).toContain("reply");
  });
  it("still works with no suggested times", () => {
    const none = instantReplyEmail(lead(), { ...links, suggestions: [] });
    expect(none.text).toContain(PICK);
  });
});

describe("followUpEmail", () => {
  it("has a distinct subject for each nudge", () => {
    const subjects = Array.from({ length: FOLLOWUP_COUNT }, (_, i) => followUpEmail(lead(), i, links).subject);
    expect(new Set(subjects).size).toBe(FOLLOWUP_COUNT);
    expect(FOLLOWUP_COUNT).toBe(5);
  });
  it("always carries the booking link, the unsubscribe link and the postal address", () => {
    for (let i = 0; i < FOLLOWUP_COUNT; i++) {
      const e = followUpEmail(lead(), i, links);
      expect(e.text).toContain(PICK);
      expect(e.text).toContain(UNSUB);
      expect(e.html).toContain(`href="${UNSUB}"`);
      expect(e.text).toContain("Syganak 4, Astana 010000, Kazakhstan");
    }
  });
  it("refuses a nudge number that does not exist", () => {
    expect(() => followUpEmail(lead(), 5, links)).toThrow();
  });
});

describe("confirmationEmail", () => {
  it("tells the family when and where, and how to change the time", () => {
    const e = confirmationEmail(bookedLead(), CALL, PICK);
    expect(e.text).toContain("Monday, March 15, 2027");
    expect(e.text).toContain("8:00 PM");
    expect(e.text).toContain(CALL);
    expect(e.text).toContain("25-minute");
    expect(e.text).toContain(PICK);
  });
  it("says the link will follow when no call link is configured", () => {
    expect(confirmationEmail(bookedLead(), "", PICK).text).toContain("send the video call link");
  });
  it("refuses a lead with no time", () => {
    expect(() => confirmationEmail(lead(), CALL, PICK)).toThrow();
  });
});

describe("owner emails", () => {
  it("announce a new lead with contact, source and a link to it", () => {
    const e = ownerLeadEmail(lead(), SITE);
    expect(e.subject).toContain("Dana");
    expect(e.text).toContain("dana@example.com");
    expect(e.text).toContain("instagram");
    expect(e.text).toContain(`${SITE}/owner/leads/11111111-2222-3333-4444-555555555555`);
  });
  it("announce a booked trial in owner time with whatever details exist", () => {
    // 2027-03-16T00:00Z is 05:00 on Tuesday 16 March in Astana.
    const e = ownerBookedEmail(bookedLead(), SITE);
    expect(e.text).toMatch(/Tuesday, March 16, 2027.*5:00 AM/);
    expect(e.text).toContain("Grade: 11");
    expect(e.text).toContain("560");
  });
  it("cope with a lead that gave no details", () => {
    const e = ownerBookedEmail(bookedLead({ studentName: undefined, grade: undefined, currentScore: undefined }), SITE);
    expect(e.text).toContain("Grade: not given");
  });
});

describe("reminderEmail", () => {
  it("names the time, the link and how to move it", () => {
    const e = reminderEmail(bookedLead(), CALL, "hour", PICK);
    expect(e.text).toContain("8:00 PM");
    expect(e.text).toContain(CALL);
    expect(e.text).toContain(PICK);
    expect(e.subject).toMatch(/1 hour/);
    expect(reminderEmail(bookedLead(), CALL, "day", PICK).subject).toMatch(/tomorrow/i);
  });
});

describe("offerEmail", () => {
  it("carries the owner's notes and the offer", () => {
    const e = offerEmail(bookedLead(), NOTES, SITE);
    expect(e.text).toContain(NOTES);
    expect(e.text).toContain("Weekly (1 lesson a week): $139 per 4 weeks");
    expect(e.text).toContain("Test Sprint");
    expect(e.text).not.toMatch(/an hour|\/hour/);
  });
  it("keeps line breaks from the notes in the html", () => {
    expect(offerEmail(bookedLead(), "First point.\nSecond point.", SITE).html).toContain("First point.<br>Second point.");
  });
});

describe("all emails", () => {
  const evil = bookedLead({ contactName: "<script>alert(1)</script>", message: "Win at https://evil.example/win" });
  const all = [
    instantReplyEmail(evil, links),
    followUpEmail(evil, 0, links),
    confirmationEmail(evil, CALL, PICK),
    ownerLeadEmail(evil, SITE),
    ownerBookedEmail(evil, SITE),
    reminderEmail(evil, CALL, "day", PICK),
    offerEmail(evil, "<b>notes</b> https://evil.example/n that are long enough", SITE),
  ];
  it("escape user-supplied text in html", () => {
    for (const e of all) {
      expect(e.html).not.toContain("<script>");
      expect(e.html).not.toContain("<b>notes</b>");
    }
    expect(all[0].html).toContain("&lt;script&gt;");
  });
  it("never turn a link typed by a visitor or the owner's notes into a clickable link", () => {
    for (const e of all) expect(e.html).not.toContain('href="https://evil.example');
  });
  it("never promise a result", () => {
    for (const e of all) expect(`${e.subject} ${e.text}`.toLowerCase()).not.toContain("guarantee");
  });
  it("carry the College Board disclaimer when sent to families", () => {
    for (const e of [all[0], all[1], all[2], all[5], all[6]]) expect(e.text).toContain("not affiliated with PiSpark");
  });
});

describe("buildIcs", () => {
  const ics = buildIcs(bookedLead(), CALL);
  it("describes a 25-minute event in UTC", () => {
    expect(ics).toContain("DTSTART:20270316T000000Z");
    expect(ics).toContain("DTEND:20270316T002500Z");
  });
  it("uses CRLF line endings throughout", () => {
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  it("names the person who signed up, escaping commas and semicolons", () => {
    expect(buildIcs(bookedLead({ contactName: "Reed, Dana; Jr" }), "")).toContain("Reed\\, Dana\\; Jr");
  });
  it("refuses a lead with no slot", () => {
    expect(() => buildIcs(lead(), "")).toThrow();
  });
});
