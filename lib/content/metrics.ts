import "server-only";
import { facebookCounts, instagramCounts, metaConnected } from "./meta";
import { listRecentlyPublished, saveMetrics, type PostMetrics } from "./repo";

/** Likes and comments settle within a few weeks; after that a post is left alone. */
export const MEASURE_DAYS = 21;

/**
 * Refresh likes, comments and shares for every post published in the last three
 * weeks. Each network is read on its own, so one failing never loses the other,
 * and nothing here can stop the day's publishing.
 */
export async function refreshMetrics(now: Date): Promise<{ measured: number; failed: number }> {
  if (!metaConnected()) return { measured: 0, failed: 0 };
  const posts = await listRecentlyPublished(new Date(now.getTime() - MEASURE_DAYS * 86_400_000));
  let measured = 0;
  let failed = 0;
  for (const post of posts) {
    const m: PostMetrics = {};
    if (post.igMediaId) {
      try {
        const ig = await instagramCounts(post.igMediaId);
        m.igLikes = ig.likes;
        m.igComments = ig.comments;
      } catch (e) {
        failed++;
        console.error("Instagram counts failed", post.id, e);
      }
    }
    if (post.fbPostId) {
      try {
        const fb = await facebookCounts(post.fbPostId);
        m.fbReactions = fb.reactions;
        m.fbComments = fb.comments;
        m.fbShares = fb.shares;
      } catch (e) {
        failed++;
        console.error("Facebook counts failed", post.id, e);
      }
    }
    if (Object.keys(m).length) {
      await saveMetrics(post.id, m);
      measured++;
    }
  }
  return { measured, failed };
}
