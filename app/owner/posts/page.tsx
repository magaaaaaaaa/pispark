import Link from "next/link";
import { PostCard } from "@/components/PostCard";
import { PostsToolbar } from "@/components/PostsToolbar";
import { requireOwnerPage } from "@/lib/admin/guard";
import { metaConnected } from "@/lib/content/meta";
import { listPosts } from "@/lib/content/repo";
import { checkPost, type Post } from "@/lib/content/schema";

export const dynamic = "force-dynamic";

const dayLabel = (d: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(
    new Date(`${d}T12:00:00Z`),
  );

export default async function OwnerPosts() {
  await requireOwnerPage();

  let posts: Post[] = [];
  let loadError: string | null = null;
  try {
    posts = await listPosts();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Unknown error";
  }
  const visible = posts.filter((p) => p.status !== "rejected");
  const drafts = visible.filter((p) => p.status === "draft").length;

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <p><Link href="/owner" className="text-sm font-semibold underline">Leads</Link></p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">Posts</h1>
      <p className="mt-2 max-w-prose text-base text-ink-soft">
        One post goes out each day at about 6:30 pm US Eastern, to Instagram and Facebook. Only
        posts you approve are published. Read each one: a wrong answer costs a maths school more
        than a missed day.
      </p>

      {loadError ? (
        <p role="alert" className="mt-6 rounded-md border-2 border-error bg-white p-4 font-semibold text-error">
          Posts could not be loaded: {loadError}
        </p>
      ) : (
        <>
          <PostsToolbar drafts={drafts} connected={metaConnected()} />
          {visible.length === 0 ? (
            <p className="mt-8 text-lg text-ink-soft">No posts yet. New drafts arrive once a week.</p>
          ) : (
            <div className="mt-6 space-y-6">
              {visible.map((p) => {
                const checked = checkPost(p);
                return (
                  <PostCard
                    key={`${p.id}-${p.status}-${p.caption.length}`}
                    id={p.id}
                    day={dayLabel(p.scheduledFor)}
                    kind={p.kind}
                    topic={p.topic}
                    status={p.status}
                    caption={p.caption}
                    slideCount={p.slides.length}
                    checkNote={p.checkNote}
                    publishError={p.publishError}
                    problems={checked.ok ? [] : checked.problems}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
