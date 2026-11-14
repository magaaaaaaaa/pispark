import { z } from "zod";

export const POST_KINDS = ["question", "mistake", "strategy", "parent", "challenge"] as const;
export type PostKind = (typeof POST_KINDS)[number];

export const POST_STATUSES = ["draft", "approved", "publishing", "published", "failed", "rejected"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export type Block =
  | { type: "text"; text: string }
  /** One line of mathematics, set large in the maths typeface. */
  | { type: "math"; text: string }
  /** Exactly four answer choices, shown as A to D. */
  | { type: "choices"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "answer"; text: string }
  /** The fixed closing slide: the free-lesson offer. Takes no text. */
  | { type: "cta" };

export interface Slide {
  title?: string;
  blocks: Block[];
}

export interface PostContent {
  kind: PostKind;
  topic: string;
  caption: string;
  slides: Slide[];
}

export interface Post extends PostContent {
  id: string;
  /** Day it should go out, as a calendar date in US Eastern time (YYYY-MM-DD). */
  scheduledFor: string;
  status: PostStatus;
  /** How the answer was verified, written by whoever generated the post. */
  checkNote: string | null;
  /** Fingerprint of the content the owner approved; null if never approved. */
  approvedHash: string | null;
  publishError: string | null;
  igMediaId: string | null;
  fbPostId: string | null;
  publishedAt: string | null;
  createdAt: string;
}

/** Everything the slide fonts can draw. Anything else would render as an empty box. */
const DRAWABLE = /^[\x20-\x7E\n−×÷±√²³π≤≥≠≈°·→½¼¾∞∠△θ’‘“”–—…]*$/u;
/** The longest run without a space that still fits on one line of a slide. */
const MAX_WORD = 26;
const fits = (s: string) => s.split(/\s+/).every((w) => w.length <= MAX_WORD);
const drawable = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((s) => DRAWABLE.test(s), "contains a character that cannot be drawn on a slide")
    .refine(fits, `has a word longer than ${MAX_WORD} characters, which would run off the slide`);

const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: drawable(320) }),
  z.object({ type: z.literal("math"), text: drawable(40) }),
  z.object({ type: z.literal("choices"), items: z.array(drawable(40)).length(4) }),
  z.object({ type: z.literal("steps"), items: z.array(drawable(160)).min(1).max(5) }),
  z.object({ type: z.literal("answer"), text: drawable(40) }),
  z.object({ type: z.literal("cta") }),
]);

const slideSchema = z.object({
  title: drawable(70).optional(),
  blocks: z.array(blockSchema).min(1).max(5),
});

const contentSchema = z.object({
  kind: z.enum(POST_KINDS),
  topic: z.string().trim().min(1).max(80),
  caption: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .refine((s) => DRAWABLE.test(s), "contains a character outside plain text and the listed maths symbols"),
  slides: z.array(slideSchema).min(1).max(6),
});

/** Rough number of text lines a slide needs. A slide holds about 20. */
export function slideWeight(slide: Slide): number {
  const lines = (s: string, perLine: number) => Math.ceil(s.length / perLine);
  let w = slide.title ? lines(slide.title, 22) * 1.6 : 0;
  for (const b of slide.blocks) {
    if (b.type === "text") w += lines(b.text, 38) + 0.5;
    else if (b.type === "math") w += 2.5;
    else if (b.type === "choices") w += 5;
    else if (b.type === "steps") w += b.items.reduce((n, s) => n + lines(s, 36) + 0.5, 0);
    else if (b.type === "answer") w += 2.5;
    else w += 8;
  }
  return w;
}
const MAX_SLIDE_WEIGHT = 20;

/** Claims a maths school must not make, wherever they appear. */
const FORBIDDEN: [RegExp, string][] = [
  [/guarantee|money[- ]back|\bpromise\b/i, "promises a result"],
  [/\b(official|real|actual)\s+SAT\s+(question|test|problem|exam)s?/i, "claims to be official SAT material"],
  [
    /\b(gain|raise|boost|improve|increase|add|jump|up)\w*\b[^.!?\n]{0,40}\b\d{2,4}\+?\s*points?\b/i,
    "promises a number of points",
  ],
  [/\bscore\b[^.!?\n]{0,20}\b1[0-6]\d\d\b|\b[2-8]\d0\+/i, "promises a score"],
];

/** Anything that looks like a web address, wherever it is written. */
const LINK = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.[a-z]{2,}\b(\/\S*)?/gi;
const OWN_LINK = /^(https?:\/\/)?(www\.)?pispark\.site(\/\S*)?$/i;
const MENTION = /@[\w.]+/g;

function allText(c: PostContent): string {
  const parts = [c.caption];
  for (const s of c.slides) {
    if (s.title) parts.push(s.title);
    for (const b of s.blocks) {
      if ("text" in b) parts.push(b.text);
      if ("items" in b) parts.push(...b.items);
    }
  }
  return parts.join("\n");
}

export type CheckResult = { ok: true; content: PostContent } | { ok: false; problems: string[] };

/**
 * Is this post fit to be shown for approval and published? Returns every
 * problem in plain words, because the owner reads them.
 */
export function checkPost(raw: unknown): CheckResult {
  const parsed = contentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      problems: parsed.error.issues.map((i) => `${i.path.join(".") || "post"}: ${i.message}`),
    };
  }
  const content = parsed.data as PostContent;
  const problems: string[] = [];

  content.slides.forEach((s, i) => {
    if (slideWeight(s) > MAX_SLIDE_WEIGHT) problems.push(`Slide ${i + 1} has more text than fits.`);
  });
  // Fold look-alike characters to their plain forms before checking for claims.
  const text = allText(content).normalize("NFKC");
  for (const [pattern, why] of FORBIDDEN) {
    if (pattern.test(text)) problems.push(`The post ${why}.`);
  }
  // Account names contain dots, so take them out before looking for web addresses.
  for (const link of text.replace(MENTION, " ").match(LINK) ?? []) {
    if (!OWN_LINK.test(link.replace(/[.,;:!?)]+$/, ""))) {
      problems.push(`The post links somewhere other than pispark.site (${link}).`);
    }
  }
  for (const mention of text.match(MENTION) ?? []) {
    if (mention.toLowerCase().replace(/\.$/, "") !== "@pispark.math") {
      problems.push(`The post mentions another account (${mention}).`);
    }
  }
  if ((content.caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).length > 8) {
    problems.push("The caption has more than eight hashtags.");
  }

  return problems.length ? { ok: false, problems } : { ok: true, content };
}

const FACEBOOK_LINK = "https://pispark.site/?utm_source=facebook&utm_medium=post";

/** Instagram captions cannot link, so they say "link in bio". Facebook posts can, so they do. */
export function facebookMessage(caption: string): string {
  const swapped = caption.replace(/link in (our |the )?bio/gi, FACEBOOK_LINK);
  return swapped === caption ? `${caption}\n\nFree trial lesson: ${FACEBOOK_LINK}` : swapped;
}
