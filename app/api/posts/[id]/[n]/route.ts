import { getPost } from "@/lib/content/repo";
import { renderSlide } from "@/lib/content/render";
import { checkPost, slideWeight } from "@/lib/content/schema";

export const dynamic = "force-dynamic";

/**
 * A post's slide as a JPEG. Public on purpose: Instagram and Facebook fetch the
 * image from this address when a post is published. Ids are unguessable.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/posts/[id]/[n]">) {
  const { id, n } = await params;
  const index = Number(n) - 1;
  try {
    const post = await getPost(id);
    if (!post || post.status === "rejected") return new Response("Not found", { status: 404 });
    // Only content that passes the rules is ever drawn.
    const checked = checkPost(post);
    if (!checked.ok) return new Response("This post does not pass the content rules", { status: 422 });
    const slide = checked.content.slides[index];
    if (!Number.isInteger(index) || !slide) return new Response("Not found", { status: 404 });

    const jpeg = await renderSlide(slide, index, checked.content.slides.length, slideWeight(slide));
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        // A published post never changes; a draft's caption can, but not its slides.
        "Cache-Control": "public, max-age=3600",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (e) {
    console.error("Slide render failed", e);
    return new Response("Could not draw this slide", { status: 500 });
  }
}
