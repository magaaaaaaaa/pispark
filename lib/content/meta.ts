import "server-only";

/**
 * The small part of Meta's Graph API this site uses: posting images to the
 * school's own Facebook Page and to the Instagram account linked to it.
 * One Page access token (META_PAGE_TOKEN) covers both.
 */
const GRAPH = "https://graph.facebook.com";

const token = () => process.env.META_PAGE_TOKEN ?? "";
export const metaConnected = () => token() !== "";

type Json = Record<string, unknown>;

async function graph(method: "GET" | "POST", path: string, params: Record<string, string>): Promise<Json> {
  const headers = { Authorization: `Bearer ${token()}` };
  let res: Response;
  if (method === "GET") {
    const url = new URL(`${GRAPH}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    res = await fetch(url, { headers });
  } else {
    // The token goes in a header and the fields in the body, never in the address.
    res = await fetch(`${GRAPH}${path}`, { method, headers, body: new URLSearchParams(params) });
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
  const me = await graph("GET", "/me", { fields: "id,name,instagram_business_account" });
  return {
    pageId: String(me.id),
    pageName: String(me.name ?? ""),
    igUserId: (me.instagram_business_account as { id?: string } | undefined)?.id ?? null,
  };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Instagram prepares a carousel before it can be published; wait for that. */
async function waitUntilReady(containerId: string): Promise<void> {
  for (let i = 0; i < 12; i++) {
    const s = await graph("GET", `/${containerId}`, { fields: "status_code" });
    if (s.status_code === "FINISHED" || s.status_code === undefined) return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") {
      throw new Error(`Instagram could not prepare the post (${s.status_code})`);
    }
    await sleep(2500);
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
