import type { Source } from "@/lib/leads/schema";

export const UTM_STORAGE_KEY = "pispark_utm";

const KEYS = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_content: "utmContent",
} as const;

/** Campaign tags from a URL query string such as "?utm_source=instagram". */
export function readUtm(search: string): Source {
  const params = new URLSearchParams(search);
  const out: Source = {};
  for (const [param, field] of Object.entries(KEYS) as [keyof typeof KEYS, (typeof KEYS)[keyof typeof KEYS]][]) {
    const value = params.get(param)?.trim();
    if (value) out[field] = value.slice(0, 100);
  }
  return out;
}
