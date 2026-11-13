import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkPost } from "@/lib/content/schema";

const dir = join(import.meta.dirname, "../../content/examples");
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

/** The example weeks are what the weekly generator imitates, so they must pass every rule. */
describe.each(files)("example batch %s", (file) => {
  const posts = JSON.parse(readFileSync(join(dir, file), "utf8")) as Record<string, unknown>[];

  it("has a post for each of five consecutive days", () => {
    expect(posts).toHaveLength(5);
    const days = posts.map((p) => String(p.scheduled_for));
    expect(new Set(days).size).toBe(5);
    for (const d of days) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it.each(posts.map((p) => [String(p.topic), p] as const))("“%s” passes the content rules", (_topic, p) => {
    const r = checkPost(p);
    expect(r.ok ? [] : r.problems).toEqual([]);
  });

  it("says how every answer was checked", () => {
    for (const p of posts) expect(String(p.check_note ?? "").length).toBeGreaterThan(10);
  });

  it("ends every post with the free-lesson slide", () => {
    for (const p of posts) {
      const slides = p.slides as { blocks: { type: string }[] }[];
      expect(slides.at(-1)!.blocks[0].type).toBe("cta");
    }
  });
});
