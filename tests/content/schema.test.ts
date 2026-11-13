import { describe, expect, it } from "vitest";
import { checkPost, facebookMessage, POST_KINDS } from "@/lib/content/schema";

const good = {
  kind: "question",
  topic: "Quadratics: vertex",
  caption: "Can you find the minimum without a calculator? Answer on the last slide.\n\nFree trial lesson: link in bio.\n\n#SAT #SATmath #digitalSAT",
  slides: [
    { title: "SAT math question of the week", blocks: [{ type: "math", text: "y = x² − 6x + 5" }, { type: "text", text: "What is the minimum value of y?" }, { type: "choices", items: ["−4", "−1", "3", "5"] }] },
    { title: "Solution", blocks: [{ type: "steps", items: ["The vertex is halfway between the roots 1 and 5: x = 3.", "y = 3² − 6·3 + 5 = −4"] }, { type: "answer", text: "A) −4" }] },
    { blocks: [{ type: "cta" }] },
  ],
};
const check = (over: object) => checkPost({ ...good, ...over });

describe("checkPost", () => {
  it("accepts a well-formed post", () => {
    const r = checkPost(good);
    expect(r.ok).toBe(true);
  });

  it("knows the five kinds of post", () => {
    expect([...POST_KINDS]).toEqual(["question", "mistake", "strategy", "parent", "challenge"]);
  });

  it.each([
    ["no slides", { slides: [] }],
    ["more than six slides", { slides: Array(7).fill(good.slides[1]) }],
    ["an unknown kind", { kind: "meme" }],
    ["an unknown block type", { slides: [{ blocks: [{ type: "video", text: "x" }] }] }],
    ["a slide with no blocks", { slides: [{ title: "Empty", blocks: [] }] }],
    ["three answer choices", { slides: [{ blocks: [{ type: "choices", items: ["1", "2", "3"] }] }] }],
    ["an empty caption", { caption: "  " }],
    ["a caption over 2000 characters", { caption: "a".repeat(2001) }],
  ])("rejects %s", (_label, over) => {
    expect(check(over).ok).toBe(false);
  });

  it("rejects text too long to fit on a slide", () => {
    const r = check({ slides: [{ blocks: [{ type: "text", text: "word ".repeat(80) }] }] });
    expect(r.ok).toBe(false);
  });

  it("rejects a slide that carries more than fits", () => {
    const text = { type: "text", text: "This is a sentence of ordinary length that fills a couple of lines on a slide. ".repeat(3) };
    expect(check({ slides: [{ title: "Too much", blocks: [text, text, text, text] }] }).ok).toBe(false);
  });

  it("rejects characters the slide fonts cannot draw", () => {
    const r = check({ slides: [{ blocks: [{ type: "math", text: "∑ x ∈ ℝ" }] }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.join(" ")).toMatch(/cannot be drawn/);
  });

  it("accepts the math symbols the fonts do have", () => {
    expect(check({ slides: [{ blocks: [{ type: "math", text: "√(x² + 9) ≤ 5π, x ≠ −½, 30° ≈ θ" }] }] }).ok).toBe(true);
  });

  it.each(["We guarantee a 1500.", "This is an official SAT question.", "Raise your score 200 points!"])(
    "rejects the claim %j anywhere in the post",
    (claim) => {
      expect(check({ caption: `${claim} Link in bio.` }).ok).toBe(false);
      expect(check({ slides: [{ blocks: [{ type: "text", text: claim }] }] }).ok).toBe(false);
    },
  );

  it("rejects a link in the caption other than our own site", () => {
    expect(check({ caption: "See https://evil.example/x" }).ok).toBe(false);
    expect(check({ caption: "Free lesson at pispark.site" }).ok).toBe(true);
  });

  it("rejects more than eight hashtags", () => {
    expect(check({ caption: "x " + Array.from({ length: 9 }, (_, i) => `#tag${i}`).join(" ") }).ok).toBe(false);
  });

  it("lists every problem, in plain words", () => {
    const r = check({ kind: "meme", caption: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.length).toBeGreaterThanOrEqual(2);
  });
});

describe("facebookMessage", () => {
  it("swaps the Instagram-only 'link in bio' for the real link", () => {
    const m = facebookMessage("Try it.\n\nFree trial lesson: link in bio.\n\n#SAT");
    expect(m).toContain("https://pispark.site/?utm_source=facebook&utm_medium=post");
    expect(m.toLowerCase()).not.toContain("link in bio");
  });
  it("adds the link when the caption never mentioned the bio", () => {
    expect(facebookMessage("Try it.")).toMatch(/Try it\.\n\nFree trial lesson: https:\/\/pispark\.site\//);
  });
});
