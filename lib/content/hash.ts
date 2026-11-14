import { createHash } from "node:crypto";
import type { PostContent } from "./schema";

/**
 * Fingerprint of exactly what a post says. Stored when the owner approves, and
 * compared again just before publishing: if anything changed in between, the
 * approval no longer covers the post.
 */
export function contentHash(c: Pick<PostContent, "kind" | "topic" | "caption" | "slides">): string {
  const canonical = JSON.stringify([
    c.kind,
    c.topic,
    c.caption,
    c.slides.map((s) => [
      s.title ?? null,
      s.blocks.map((b) => [b.type, "text" in b ? b.text : null, "items" in b ? b.items : null]),
    ]),
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}
