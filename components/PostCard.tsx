"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approvePost,
  rejectPost,
  saveCaption,
  unapprovePost,
  type PostActionResult,
} from "@/app/owner/posts/actions";
import type { PostStatus } from "@/lib/content/schema";

const STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Waiting for your approval",
  approved: "Approved, will be published",
  publishing: "Being published now",
  published: "Published",
  failed: "Not published",
  rejected: "Rejected",
};

export function PostCard({
  id,
  day,
  kind,
  topic,
  status,
  caption,
  slideCount,
  checkNote,
  publishError,
  problems,
}: {
  id: string;
  day: string;
  kind: string;
  topic: string;
  status: PostStatus;
  caption: string;
  slideCount: number;
  checkNote: string | null;
  publishError: string | null;
  problems: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState(caption);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const valid = problems.length === 0;
  const editable = status === "draft" || status === "approved" || status === "failed";

  const run = (action: () => Promise<PostActionResult>, done: string) =>
    start(async () => {
      const res = await action();
      setNote(res.ok ? { ok: true, text: done } : { ok: false, text: res.error });
      router.refresh();
    });

  const button = "rounded-md border-2 border-ink px-4 py-2 text-sm font-bold disabled:opacity-50";

  return (
    <article className="rounded-lg border-2 border-ink bg-white p-4 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-extrabold text-ink">
          {day} · {topic}
        </h2>
        <p className={`text-sm font-bold ${status === "failed" ? "text-error" : "text-ink-soft"}`}>
          {STATUS_LABEL[status]} · {kind}
        </p>
      </header>

      {!valid && (
        <div role="alert" className="mt-3 rounded-md border-2 border-error p-3 text-error">
          <p className="font-bold">This post breaks the content rules and cannot be approved:</p>
          <ul className="ml-5 list-disc">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}
      {publishError && (
        <p role="alert" className="mt-3 rounded-md border-2 border-error p-3 text-error">
          <strong>{status === "published" ? "It did not reach every account." : "Publishing failed."}</strong> {publishError}
        </p>
      )}

      {valid && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: slideCount }, (_, i) => (
            <a key={i} href={`/api/posts/${id}/${i + 1}`} download={`pispark-${day}-${i + 1}.jpg`} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- drawn on demand by our own route */}
              <img
                src={`/api/posts/${id}/${i + 1}`}
                alt={`Slide ${i + 1} of ${slideCount}`}
                width={216}
                height={270}
                loading="lazy"
                className="h-[270px] w-[216px] rounded-md border-2 border-grid"
              />
            </a>
          ))}
        </div>
      )}
      {valid && <p className="text-sm text-ink-soft">Tap a slide to download it, for posting by hand.</p>}

      <label htmlFor={`caption-${id}`} className="mt-4 block text-sm font-semibold text-ink">Caption</label>
      <textarea
        id={`caption-${id}`}
        rows={6}
        value={draft}
        readOnly={!editable}
        onChange={(e) => setDraft(e.target.value)}
        className="mt-1 block w-full rounded-md border-2 border-ink bg-white px-3 py-2 text-base read-only:bg-paper"
      />
      {checkNote && <p className="mt-2 text-sm text-ink-soft">How the answer was checked: {checkNote}</p>}

      {editable && (
        <div className="mt-4 flex flex-wrap gap-2">
          {status !== "approved" && (
            <button type="button" disabled={pending || !valid} onClick={() => run(() => approvePost(id), status === "failed" ? "Queued to try again." : "Approved.")} className={`${button} bg-spark text-ink`}>
              {status === "failed" ? "Try again" : "Approve"}
            </button>
          )}
          {status === "approved" && (
            <button type="button" disabled={pending} onClick={() => run(() => unapprovePost(id), "Back to draft.")} className={`${button} bg-white text-ink`}>
              Undo approval
            </button>
          )}
          <button type="button" disabled={pending || draft === caption} onClick={() => run(() => saveCaption(id, draft), "Caption saved.")} className={`${button} bg-white text-ink`}>
            Save caption
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => rejectPost(id), "Rejected.")} className={`${button} bg-white text-error`}>
            Reject
          </button>
        </div>
      )}
      {note && <p role="status" className={`mt-3 font-semibold ${note.ok ? "text-ink" : "text-error"}`}>{note.text}</p>}
    </article>
  );
}
