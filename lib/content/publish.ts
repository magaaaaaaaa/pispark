import "server-only";
import { sendEmail } from "@/lib/email/send";
import { contentHash } from "./hash";
import { metaAccounts, metaConnected, publishToFacebook, publishToInstagram } from "./meta";
import {
  claimNextApproved,
  countApproved,
  countDrafts,
  expireMissed,
  listUnnotifiedDrafts,
  markFailed,
  markNotified,
  markPublished,
  reclaimStale,
  saveNetworkId,
  sendBackToDraft,
} from "./repo";
import { checkPost, facebookMessage, type Post } from "./schema";

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "https://pispark.site";
const postsPage = () => `${siteUrl()}/owner/posts`;

/** A run that died this long ago is not coming back. */
const STALE_AFTER_MS = 15 * 60_000;
const CHECK_FIRST =
  "Check Instagram and Facebook first: if the post is there, press Reject so it is not sent again; if it is not, press Try again.";

/** The calendar date in New York, which is what "today's post" means for a US audience. */
export function easternDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
}

/** The calendar day before a YYYY-MM-DD date. */
export function previousDay(day: string): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
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
  try {
    await sendEmail({
      to: process.env.OWNER_EMAIL,
      subject,
      text: lines.join("\n\n"),
      html: `<div style="font-family:sans-serif;font-size:16px;line-height:1.5">${lines
        .map((l) => `<p>${l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`)
        .join("")}</div>`,
    });
    return true;
  } catch (e) {
    console.error("Could not email the owner:", subject, e);
    return false;
  }
}

/** Publish a claimed post. Every exit leaves the post in a final state. */
async function publishOne(post: Post): Promise<"published" | "failed" | "withdrawn"> {
  // The approval covers exactly what the owner saw, and only rule-abiding content.
  const checked = checkPost(post);
  const reason = !checked.ok
    ? `It no longer passes the content rules: ${checked.problems.join(" ")}`
    : post.approvedHash !== contentHash(checked.content)
      ? "It was changed after you approved it."
      : null;
  if (reason) {
    await sendBackToDraft(post.id, `Not published. ${reason} Read it again and approve it if it is right.`);
    await tellOwner("PiSpark: a post needs you to approve it again", [
      `"${post.topic}" (${post.scheduledFor}) was not published. ${reason}`,
      `Read it again and approve it if it is right: ${postsPage()}`,
    ]);
    return "withdrawn";
  }

  let accounts;
  try {
    accounts = await metaAccounts();
  } catch (e) {
    await markFailed(post.id, `Could not reach your accounts: ${message(e)}`);
    await tellOwner("PiSpark: today's post was not published", [
      `Instagram and Facebook could not be reached: ${message(e)}`,
      `This usually means the access token has expired or been revoked. Renew it (see the owner guide), then press "Try again" on the post: ${postsPage()}`,
    ]);
    return "failed";
  }

  const images = slideUrls(post);
  const problems: string[] = [];
  let onInstagram = post.igMediaId !== null;
  let onFacebook = post.fbPostId !== null;

  // A network that already has the post (from an earlier, interrupted attempt) is skipped.
  if (!onInstagram) {
    if (!accounts.igUserId) {
      problems.push("Instagram: no Instagram account is linked to the Facebook Page.");
    } else {
      try {
        const id = await publishToInstagram(accounts.igUserId, images, post.caption);
        onInstagram = true;
        await saveNetworkId(post.id, "ig", id);
      } catch (e) {
        problems.push(`Instagram: ${message(e)}`);
      }
    }
  }
  if (!onFacebook) {
    try {
      const id = await publishToFacebook(accounts.pageId, images, facebookMessage(post.caption));
      onFacebook = true;
      await saveNetworkId(post.id, "fb", id);
    } catch (e) {
      problems.push(`Facebook: ${message(e)}`);
    }
  }

  if (!onInstagram && !onFacebook) {
    await markFailed(post.id, problems.join(" | "));
    await tellOwner("PiSpark: today's post was not published", [
      `"${post.topic}" could not be published.`,
      problems.join("\n"),
      `Fix the cause, then press "Try again" on the post: ${postsPage()}`,
    ]);
    return "failed";
  }

  await markPublished(post.id, problems.length ? problems.join(" | ") : null);
  if (problems.length) {
    const missing = onInstagram ? "Facebook" : "Instagram";
    await tellOwner(`PiSpark: today's post did not reach ${missing}`, [
      `"${post.topic}" went out, but not everywhere.`,
      problems.join("\n"),
      `You can post it there by hand; the images and caption are on ${postsPage()}`,
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

/** The daily content job. */
export async function runContent(now: Date): Promise<ContentRun> {
  const run: ContentRun = { connected: metaConnected(), published: 0, failed: 0, notified: 0 };
  const today = easternDate(now);
  const yesterday = previousDay(today);

  // 1. Anything an earlier run left half-done is flagged, never silently retried.
  const interrupted = await reclaimStale(new Date(now.getTime() - STALE_AFTER_MS));
  if (interrupted.length) {
    run.failed += interrupted.length;
    await tellOwner("PiSpark: a post needs a look", [
      `Publishing was interrupted for: ${interrupted.map((p) => `"${p.topic}" (${p.scheduledFor})`).join(", ")}.`,
      CHECK_FIRST,
      postsPage(),
    ]);
  }

  // 2. Approved posts more than a day late are retired rather than published out of order.
  const missed = await expireMissed(yesterday);
  if (missed.length) {
    await tellOwner("PiSpark: approved posts missed their day", [
      `These were approved but not published in time: ${missed.map((p) => `"${p.topic}" (${p.scheduledFor})`).join(", ")}.`,
      `Press "Try again" on any you still want; it goes out on the next run. ${postsPage()}`,
    ]);
  }

  // 3. Publish the post that is due.
  let wentOut = false;
  if (run.connected) {
    const post = await claimNextApproved(yesterday, today);
    if (post) {
      try {
        const outcome = await publishOne(post);
        if (outcome === "published") {
          run.published++;
          wentOut = true;
        } else if (outcome === "failed") run.failed++;
      } catch (e) {
        // Something unexpected, possibly after a network accepted the post.
        console.error("Publishing crashed", e);
        run.failed++;
        await markFailed(post.id, `Something went wrong part-way: ${message(e)}. ${CHECK_FIRST}`).catch((err) =>
          console.error("Could not mark the post failed", err),
        );
        await tellOwner("PiSpark: a post needs a look", [
          `Publishing "${post.topic}" stopped part-way: ${message(e)}`,
          CHECK_FIRST,
          postsPage(),
        ]);
      }
    }
  } else if ((await countApproved(today)) > 0) {
    await tellOwner("PiSpark: Instagram and Facebook are not connected", [
      "Today's post is approved, but the site cannot publish it until the accounts are connected.",
      `Follow "Connect Instagram and Facebook" in the owner guide. Meanwhile you can download the slides and post by hand: ${postsPage()}`,
    ]);
  }

  // 4. A silent day should never be a surprise.
  if (run.connected && !wentOut && run.failed === 0 && (await countDrafts(today)) > 0) {
    await tellOwner("PiSpark: nothing was published today", [
      "Today's post was still waiting for your approval, so nothing went out.",
      `Approve the coming days here: ${postsPage()}`,
    ]);
  }

  // 5. Announce new drafts, once.
  const drafts = await listUnnotifiedDrafts();
  if (drafts.length) {
    const sent = await tellOwner(`PiSpark: ${drafts.length} new post${drafts.length === 1 ? "" : "s"} to approve`, [
      `New posts are ready for your approval, scheduled from ${drafts[0].scheduledFor}.`,
      drafts.map((d) => `${d.scheduledFor}  ${d.topic}`).join("\n"),
      `Look them over and approve: ${postsPage()}`,
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
