"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendOffer, setStage, type ActionResult } from "@/app/owner/actions";
import { STAGES, type Stage } from "@/lib/config";

export function LeadControls({
  id,
  stage,
  notes,
  labels,
}: {
  id: string;
  stage: Stage;
  notes: string;
  labels: Record<Stage, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState(notes);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (action: () => Promise<ActionResult>, done: string) =>
    start(async () => {
      const res = await action();
      setMessage(res.ok ? { ok: true, text: done } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-bold text-ink">Stage</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending || s === stage}
              aria-pressed={s === stage}
              onClick={() => run(() => setStage(id, s), `Stage set to “${labels[s]}”.`)}
              className={`rounded-md border-2 border-ink px-3 py-1.5 text-sm font-semibold ${s === stage ? "bg-ink text-white" : "bg-white text-ink disabled:opacity-60"}`}
            >
              {labels[s]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-ink">After the trial</h2>
        <label htmlFor="notes" className="mt-2 block text-sm text-ink-soft">
          Three or four lines for the family: what you saw and what you suggest. This text goes
          into the offer email as written.
        </label>
        <textarea
          id="notes"
          rows={6}
          maxLength={4000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="mt-1 block w-full rounded-md border-2 border-ink bg-white px-3 py-2 text-base"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => sendOffer(id, draft), "Offer sent.")}
          className="mt-3 rounded-md border-2 border-ink bg-spark px-5 py-2 font-bold text-ink disabled:opacity-60"
        >
          {pending ? "Working…" : "Send offer"}
        </button>
      </section>

      {message && (
        <p role="status" className={`font-semibold ${message.ok ? "text-ink" : "text-error"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
