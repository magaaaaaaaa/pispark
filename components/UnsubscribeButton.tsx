"use client";

import { useState } from "react";
import { CONTACT_EMAIL } from "@/lib/config";

export function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");

  async function stop() {
    setState("working");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return <p className="mt-6 text-lg font-semibold text-ink">Done. You will not get any more of these emails.</p>;
  }
  return (
    <>
      <button
        type="button"
        onClick={stop}
        disabled={state === "working"}
        className="mt-6 rounded-lg border-2 border-ink bg-ink px-6 py-3 text-lg font-bold text-white disabled:opacity-60"
      >
        {state === "working" ? "Stopping…" : "Stop these emails"}
      </button>
      {state === "error" && (
        <p role="alert" className="mt-3 font-semibold text-error">
          That did not work. Email {CONTACT_EMAIL} with the word “stop” and we will do it by hand.
        </p>
      )}
    </>
  );
}
