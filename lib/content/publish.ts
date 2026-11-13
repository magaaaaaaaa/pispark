import "server-only";
import { sendEmail } from "@/lib/email/send";
import {
  claimNextApproved,
  listUnnotifiedDrafts,
  markFailed,
  markNotified,
  markPublished,
} from "./repo";
import { metaAccounts, metaConnected, publishToFacebook, publishToInstagram } from "./meta";
import { facebookMessage, type Post } from "./schema";

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "https://pispark.site";

/** The calendar date in New York, which is what "today's post" means for a US audience. */
export function easternDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
}

/** Public addresses of a post's slide images, in order. Meta fetches them from here. */
export function slideUrls(post: Pick<Post, "id" | "slides">): string[] {
  return post.slides.map((_, i) => `${siteUrl()}/api/posts/${post.id}/${i + 1}`);
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function tellOwner(subject: string, lines: string[]): Promise<boolean> {
  if (!process.env.OWNER_EMAIL) {
    console.error("OWNER_EMAIL is not set; could not send:", subject);
    return false;
  }
  const text = lines.join("\n\n");
  try {
    await sendEmail({
      to: process.env.OWNER_EMAIL,
      subject,
      text,
      html: `<div style="font-family:sans-serif;font-size:16px;line-height:1.5">${lines
        .map((l) => `<p>${l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`)
        .join("")}</div>`,
    });
    return true;
  } catch (e) {
    console.error("Could not email the owner", e);
    return false;
  }
}

async function publishOne(post: Post): Promise<"published" | "failed"> {
  const postsPage = `${siteUrl()}/owner/posts`;
  let accounts;
  try {
    accounts = await metaAccounts();
  } catch (e) {
    await markFailed(post.id, `Could not reach your accounts: ${message(e)}`);
    await tellOwner("PiSpark: today's post was not published", [
      `Instagram and Facebook could not be reached: ${message(e)}`,
      `This usually means the access token has expired or been revoked. Renew it (see the owner guide), then press "Try again" on the post: ${postsPage}`,
    ]);
    return "failed";
  }

  const images = slideUrls(post);
  const problems: string[] = [];
  let igMediaId: string | null = null;
  let fbPostId: string | null = null;

  if (accounts.igUserId) {
    try {
      igMediaId = await publishToInstagram(accounts.igUserId, images, post.caption);
    } catch (e) {
      problems.push(`Instagram: ${message(e)}`);
    }
  } else {
    problems.push("Instagram: no Instagram account is linked to the Facebook Page.");
  }
  try {
    fbPostId = await publishToFacebook(accounts.pageId, images, facebookMessage(post.caption));
  } catch (e) {
    problems.push(`Facebook: ${message(e)}`);
  }

  if (!igMediaId && !fbPostId) {
    await markFailed(post.id, problems.join(" | "));
    await tellOwner("PiSpark: today's post was not published", [
      `"${post.topic}" could not be published.`,
      problems.join("\n"),
      `Fix the cause, then press "Try again" on the post: ${postsPage}`,
    ]);
    return "failed";
  }

  await markPublished(post.id, { igMediaId, fbPostId, error: problems.length ? problems.join(" | ") : null });
  if (problems.length) {
    const where = igMediaId ? "Facebook" : "Instagram";
    await tellOwner(`PiSpark: today's post did not reach ${where}`, [
      `"${post.topic}" went out, but not everywhere.`,
      problems.join("\n"),
      `You can post it there by hand; the images and caption are on ${postsPage}`,
    ]);
  }
  return "published";
}

export interface ContentRun {
  connected: boolean;
  published: number;
  failed: number;
  /** Number of new drafts the owner was told about. */
  notified: number;
}

/** The daily content job: publish the approved post that is due, and announce new drafts. */
export async function runContent(now: Date): Promise<ContentRun> {
  const run: ContentRun = { connected: metaConnected(), published: 0, failed: 0, notified: 0 };

  if (run.connected) {
    const post = await claimNextApproved(easternDate(now));
    if (post) {
      const outcome = await publishOne(post).catch(async (e) => {
        // Something unexpected: never leave the post stuck as "publishing".
        console.error("Publishing crashed", e);
        await markFailed(post.id, message(e)).catch(() => undefined);
        return "failed" as const;
      });
      run[outcome]++;
    }
  }

  const drafts = await listUnnotifiedDrafts();
  if (drafts.length) {
    const sent = await tellOwner(`PiSpark: ${drafts.length} new post${drafts.length === 1 ? "" : "s"} to approve`, [
      `New posts are ready for your approval, scheduled from ${drafts[0].scheduledFor}.`,
      drafts.map((d) => `${d.scheduledFor}  ${d.topic}`).join("\n"),
      `Look them over and approve: ${siteUrl()}/owner/posts`,
      run.connected
        ? "Only approved posts are published. Anything you leave as a draft stays unpublished."
        : "Instagram and Facebook are not connected yet, so approved posts will wait. You can still download the images and post them by hand.",
    ]);
    if (sent) {
      await markNotified(drafts.map((d) => d.id));
      run.notified = drafts.length;
    }
  }
  return run;
}
