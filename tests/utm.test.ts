import { describe, expect, it } from "vitest";
import { readUtm } from "@/lib/utm";

describe("readUtm", () => {
  it("picks the campaign tags out of a landing URL and ignores the rest", () => {
    expect(readUtm("?utm_source=instagram&utm_medium=bio&utm_campaign=launch&x=1")).toEqual({
      utmSource: "instagram",
      utmMedium: "bio",
      utmCampaign: "launch",
    });
  });
  it("returns nothing for a plain visit", () => {
    expect(readUtm("")).toEqual({});
  });
  it("cuts an over-long tag to 100 characters", () => {
    expect(readUtm(`?utm_content=${"a".repeat(150)}`).utmContent).toHaveLength(100);
  });
  it("drops empty tags", () => {
    expect(readUtm("?utm_source=&utm_medium=bio")).toEqual({ utmMedium: "bio" });
  });
});
