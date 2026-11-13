import { formatShort, type FamilyLinks } from "@/lib/email/templates";
import type { Lead } from "@/lib/leads/schema";
import { leadToken, tokenSecret } from "./token";

export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "https://pispark.site";

/** The signed links we email to a family. Throws if links cannot be signed. */
export function familyLinks(lead: Lead, suggested: string[] = []): FamilyLinks {
  const token = leadToken(lead.id, tokenSecret());
  const pickUrl = `${siteUrl()}/pick?l=${token}`;
  return {
    pickUrl,
    unsubscribeUrl: `${siteUrl()}/unsubscribe?l=${token}`,
    suggestions: suggested.map((s) => ({
      label: formatShort(s, lead.timezone),
      url: `${pickUrl}&slot=${encodeURIComponent(s)}`,
    })),
  };
}
