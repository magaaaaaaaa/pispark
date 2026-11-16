import "server-only";

/**
 * The small part of Meta's Graph API this site uses: posting images to the
 * school's own Facebook Page and to the Instagram account linked to it.
 *
 * META_PAGE_TOKEN may hold either a Page token, or a system user (or user) token
 * from Meta Business Suite that has access to the Page. With the second kind
 * the site looks up the Page's own token itself, preferring the Page that has
 * an Instagram account linked, or the one named in META_PAGE_NAME.
 */
// No version in the address on purpose: Meta then uses the app's own default
// version, so this does not break when an old pinned version is retired.
const GRAPH = "https://graph.facebook.com";
/** No single call may hang the daily job. */
const TIMEOUT_MS = 10_000;

const token = () => process.env.META_PAGE_TOKEN ?? "";
export const metaConnected = () => token() !== "";

type Json = Record<string, unknown>;

async function graph(
  method: "GET" | "POST",
  path: string,
  params: Record<string, string>,
  as: string | null = null,
): Promise<Json> {
  const headers = { Authorization: `Bearer ${as ?? (await page()).token}` };
  let res: Response;
  if (method === "GET") {
    const url = new URL(`${GRAPH}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } else {
    // The token goes in a header and the fields in the body, never in the address.
    res = await fetch(`${GRAPH}${path}`, {
      method,
      headers,
      body: new URLSearchParams(params),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }
  const body = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok || body.error) {
    const message = (body.error as { message?: string } | undefined)?.message;
    throw new Error(message ?? `Meta answered ${res.status}`);
  }
  return body;
}

export interface MetaAccounts {
  pageId: string;
  pageName: string;
  /** null when no Instagram professional account is linked to the Page. */
  igUserId: string | null;
}

/** Which Page the token belongs to, and its linked Instagram account. */
export async function metaAccounts(): Promise<MetaAccounts> {
  const { pageId, pageName, igUserId } = await page();
  return { pageId, pageName, igUserId };
}

/** For tests: forget which Page the last token resolved to. */
export function forgetPage(): void {
  resolved = null;
}

interface PageAccess {
  pageId: string;
  pageName: string;
  igUserId: string | null;
  /** The token to act as the Page with. */
  token: string;
}

let resolved: { key: string; at: number; access: Promise<PageAccess> } | null = null;
/** Re-check now and then, so a token swapped in Vercel takes effect without a restart. */
const RESOLVE_TTL_MS = 10 * 60_000;

/** Which Page the token gives access to, and the token to act as that Page. */
function page(): Promise<PageAccess> {
  const key = token();
  if (!resolved || resolved.key !== key || Date.now() - resolved.at > RESOLVE_TTL_MS) {
    const access = resolvePage(key);
    resolved = { key, at: Date.now(), access };
    access.catch(() => {
      if (resolved?.access === access) resolved = null;
    });
  }
  return resolved.access;
}

const igId = (v: unknown) => (v as { id?: string } | undefined)?.id ?? null;

async function resolvePage(key: string): Promise<PageAccess> {
  let me: Json;
  try {
    // A Page token answers as the Page itself.
    me = await graph("GET", "/me", { fields: "id,name,instagram_business_account" }, key);
    return { pageId: String(me.id), pageName: String(me.name ?? ""), igUserId: igId(me.instagram_business_account), token: key };
  } catch (e) {
    // Any other token (system user, user) has no such field on itself; anything else is a real failure.
    if (!/instagram_business_account|nonexisting field/i.test(e instanceof Error ? e.message : "")) throw explain(e);
  }
  const list = await graph("GET", "/me/accounts", { fields: "id,name,access_token,instagram_business_account", limit: "100" }, key).catch(
    (e) => {
      throw explain(e);
    },
  );
  const pages = ((list.data as Json[] | undefined) ?? []).filter((p) => p.access_token);
  const wanted = (process.env.META_PAGE_NAME ?? "").trim().toLowerCase();
  const chosen =
    (wanted && pages.find((p) => String(p.name ?? "").toLowerCase() === wanted)) ||
    pages.find((p) => igId(p.instagram_business_account)) ||
    pages[0];
  if (!chosen) {
    throw new Error(
      "This token cannot see any Facebook Page. In Meta Business Suite, give it (or its system user) access to the PiSpark Math Page and make a new token.",
    );
  }
  return {
    pageId: String(chosen.id),
    pageName: String(chosen.name ?? ""),
    igUserId: igId(chosen.instagram_business_account),
    token: String(chosen.access_token),
  };
}

/** Meta's permission errors, in words the owner can act on. */
function explain(e: unknown): Error {
  const m = e instanceof Error ? e.message : String(e);
  if (/must be granted|permission|OAuthException|session has expired|validating access token/i.test(m)) {
    return new Error(
      `${m} — The saved token has lost its access. Make a new one (owner guide, "Connect Instagram and Facebook"), save it in Vercel as META_PAGE_TOKEN and redeploy.`,
    );
  }
  return e instanceof Error ? e : new Error(m);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Instagram prepares a carousel before it can be published; wait for that. */
async function waitUntilReady(containerId: string): Promise<void> {
  for (let i = 0; i < 8; i++) {
    const s = await graph("GET", `/${containerId}`, { fields: "status_code" });
    if (s.status_code === "FINISHED" || s.status_code === "PUBLISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") {
      throw new Error(`Instagram could not prepare the post (${s.status_code})`);
    }
    await sleep(2000);
  }
  throw new Error("Instagram took too long to prepare the post");
}

/** Publish one image, or several as a carousel. Returns the new media id. */
export async function publishToInstagram(
  igUserId: string,
  imageUrls: string[],
  caption: string,
): Promise<string> {
  let containerId: string;
  if (imageUrls.length === 1) {
    const c = await graph("POST", `/${igUserId}/media`, { image_url: imageUrls[0], caption });
    containerId = String(c.id);
  } else {
    const children: string[] = [];
    for (const image_url of imageUrls) {
      const c = await graph("POST", `/${igUserId}/media`, { image_url, is_carousel_item: "true" });
      children.push(String(c.id));
    }
    const c = await graph("POST", `/${igUserId}/media`, {
      media_type: "CAROUSEL",
      children: children.join(","),
      caption,
    });
    containerId = String(c.id);
  }
  await waitUntilReady(containerId);
  const published = await graph("POST", `/${igUserId}/media_publish`, { creation_id: containerId });
  return String(published.id);
}

/** Publish one post with all the images attached. Returns the new post id. */
export async function publishToFacebook(
  pageId: string,
  imageUrls: string[],
  message: string,
): Promise<string> {
  const params: Record<string, string> = { message };
  for (let i = 0; i < imageUrls.length; i++) {
    const photo = await graph("POST", `/${pageId}/photos`, { url: imageUrls[i], published: "false" });
    params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: String(photo.id) });
  }
  const post = await graph("POST", `/${pageId}/feed`, params);
  return String(post.id);
}

/** Public counts for one Instagram post. */
export async function instagramCounts(mediaId: string): Promise<{ likes: number; comments: number }> {
  const m = await graph("GET", `/${mediaId}`, { fields: "like_count,comments_count" });
  return { likes: Number(m.like_count ?? 0), comments: Number(m.comments_count ?? 0) };
}

/** Public counts for one Facebook Page post. */
export async function facebookCounts(
  postId: string,
): Promise<{ reactions: number; comments: number; shares: number }> {
  const p = await graph("GET", `/${postId}`, {
    fields: "reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares",
  });
  const total = (v: unknown) => Number((v as { summary?: { total_count?: number } } | undefined)?.summary?.total_count ?? 0);
  return {
    reactions: total(p.reactions),
    comments: total(p.comments),
    shares: Number((p.shares as { count?: number } | undefined)?.count ?? 0),
  };
}
