"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveAll, testConnection } from "@/app/owner/posts/actions";

export function PostsToolbar({ drafts, connected }: { drafts: number; connected: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const button = "rounded-md border-2 border-ink px-4 py-2 text-sm font-bold disabled:opacity-50";

  return (
    <div className="mt-6 rounded-lg border-2 border-ink bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || drafts === 0}
          onClick={() =>
            start(async () => {
              const r = await approveAll();
              setNote({
                ok: true,
                text: `Approved ${r.approved}.${r.skipped ? ` Skipped ${r.skipped} that break the content rules.` : ""}`,
              });
              router.refresh();
            })
          }
          className={`${button} bg-spark text-ink`}
        >
          Approve all {drafts} draft{drafts === 1 ? "" : "s"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { const r = await testConnection(); setNote({ ok: r.ok, text: r.message }); })}
          className={`${button} bg-white text-ink`}
        >
          Test Instagram and Facebook connection
        </button>
      </div>
      {!connected && (
        <p className="mt-3 text-base text-ink">
          Instagram and Facebook are not connected yet, so approved posts wait in the queue. Until
          then, tap a slide to download it and post by hand.
        </p>
      )}
      {note && <p role="status" className={`mt-3 font-semibold ${note.ok ? "text-ink" : "text-error"}`}>{note.text}</p>}
    </div>
  );
}
