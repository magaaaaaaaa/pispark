import { cookies } from "next/headers";
import { OWNER_COOKIE, verifySessionToken } from "@/lib/admin/session";
import { getPost } from "@/lib/content/repo";
import { renderSlide } from "@/lib/content/render";
import { checkPost, slideWeight } from "@/lib/content/schema";

export const dynamic = "force-dynamic";

/** States in which Instagram and Facebook may need to fetch the image. */
const PUBLIC = new Set(["approved", "publishing", "published"]);

/**
 * A post's slide as a JPEG. Approved and published posts are public, because
 * Meta fetches the image from this address when a post goes out. Anything else
 * (a draft, a failed post) is shown only to the signed-in owner.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/posts/[id]/[n]">) {
  const { id, n } = await params;
  const index = Number(n) - 1;
  try {
    const post = await getPost(id);
    if (!post || post.status === "rejected") return new Response("Not found", { status: 404 });

    const open = PUBLIC.has(post.status);
    if (!open) {
      const token = (await cookies()).get(OWNER_COOKIE)?.value;
      if (!verifySessionToken(token, process.env.SESSION_SECRET ?? "", new Date())) {
        return new Response("Not found", { status: 404 });
      }
    }

    // Only content that passes the rules is ever drawn.
    const checked = checkPost(post);
    if (!checked.ok) return new Response("This post does not pass the content rules", { status: 422 });
    const slide = checked.content.slides[index];
    if (!Number.isInteger(index) || !slide) return new Response("Not found", { status: 404 });

    const jpeg = await renderSlide(slide, index, checked.content.slides.length, slideWeight(slide));
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        // Published slides can be cached at the edge; the owner's previews never are.
        "Cache-Control": post.status === "published" ? "public, max-age=3600, s-maxage=86400" : "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (e) {
    console.error("Slide render failed", e);
    return new Response("Could not draw this slide", { status: 500 });
  }
}
