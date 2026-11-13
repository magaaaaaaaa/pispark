"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { CONTACT_EMAIL, TRIAL_MINUTES } from "@/lib/config";
import { INSTAGRAM_DM_URL } from "@/lib/links";
import { UTM_STORAGE_KEY } from "@/lib/utm";

const inputClass =
  "mt-1 block w-full rounded-lg border-2 border-ink bg-white px-4 py-3 text-lg text-ink placeholder:text-ink-soft/60";
const labelClass = "block text-sm font-semibold text-ink";

function storedUtm(): Record<string, string> {
  try {
    return JSON.parse(window.sessionStorage.getItem(UTM_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/**
 * Step one of the funnel: a first name and an email. The lead is saved the
 * moment this is sent; picking a time comes afterwards and is optional.
 */
export function CaptureForm() {
  const router = useRouter();
  const uid = useId();
  const [role, setRole] = useState<"parent" | "student">("parent");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    const data = new FormData(e.currentTarget);
    const text = (k: string) => String(data.get(k) ?? "");

    setSending(true);
    setErrors({});
    setNotice(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          firstName: text("firstName"),
          email: text("email"),
          parentEmail: role === "student" ? text("parentEmail") : undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          source: storedUtm(),
          website: text("pispark-check"),
        }),
      });
      const body = await res.json().catch(() => null);

      if (res.ok && body?.ok) {
        try {
          window.fbq?.("track", "Lead");
        } catch {
          // Tracking is optional.
        }
        // The link to this family's lead travels in a cookie, not the address bar.
        router.push(body.existing ? "/pick?sent=1" : "/pick?new=1");
        return;
      }
      if (res.status === 400 && Array.isArray(body?.issues)) {
        const next: Record<string, string> = {};
        for (const i of body.issues as { path: string; message: string }[]) next[i.path] ??= i.message;
        setErrors(next);
        const first = ["firstName", "email", "parentEmail"].find((k) => next[k]);
        if (first) document.getElementById(`${uid}-${first}`)?.focus();
        else setNotice(`That did not go through. Email us at ${CONTACT_EMAIL} and we will set it up.`);
      } else if (res.status === 429) {
        setNotice(`Too many sign-ups from this connection in the last hour. Email us at ${CONTACT_EMAIL} instead.`);
      } else {
        setNotice(`That did not go through. Try again, or email us at ${CONTACT_EMAIL}.`);
      }
    } catch {
      setNotice(`No connection. Check your internet and try again, or email us at ${CONTACT_EMAIL}.`);
    }
    setSending(false);
  }

  const err = (k: string) =>
    errors[k] ? (
      <p id={`${uid}-${k}-error`} role="alert" className="mt-1 text-sm font-semibold text-error">
        {errors[k]}
      </p>
    ) : null;
  const field = (k: string) => ({
    id: `${uid}-${k}`,
    name: k,
    ...(errors[k] ? { "aria-invalid": true, "aria-describedby": `${uid}-${k}-error` } : {}),
  });

  return (
    <form onSubmit={onSubmit} action="/api/lead" method="post" noValidate className="space-y-4">
      <div>
        <label htmlFor={`${uid}-firstName`} className={labelClass}>First name</label>
        <input {...field("firstName")} required maxLength={80} autoComplete="given-name" className={inputClass} />
        {err("firstName")}
      </div>
      <div>
        <label htmlFor={`${uid}-email`} className={labelClass}>Email</label>
        <input {...field("email")} type="email" required autoComplete="email" inputMode="email" className={inputClass} />
        {err("email")}
      </div>

      <fieldset>
        <legend className="sr-only">Who is signing up?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["parent", "student"] as const).map((r) => (
            <label
              key={r}
              className={`cursor-pointer rounded-lg border-2 border-ink px-3 py-2 text-center text-base font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-plot ${role === r ? "bg-ink text-white" : "bg-white text-ink"}`}
            >
              <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
              {r === "parent" ? "I’m a parent" : "I’m the student"}
            </label>
          ))}
        </div>
      </fieldset>

      {role === "student" && (
        <div>
          <label htmlFor={`${uid}-parentEmail`} className={labelClass}>A parent’s email</label>
          <input {...field("parentEmail")} type="email" required inputMode="email" className={inputClass} />
          <p className="mt-1 text-sm text-ink-soft">We copy a parent in. That is all we use it for.</p>
          {err("parentEmail")}
        </div>
      )}

      {/* Hidden from people; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${uid}-check`}>Leave this box empty</label>
        <input id={`${uid}-check`} name="pispark-check" tabIndex={-1} autoComplete="off" />
      </div>

      {notice && (
        <p role="alert" className="rounded-lg border-2 border-error bg-white p-3 font-semibold text-error">
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-lg border-2 border-ink bg-spark px-6 py-4 text-xl font-extrabold text-ink disabled:opacity-60"
      >
        {sending ? "Saving your spot…" : "Get my free trial lesson"}
      </button>

      <p className="text-sm leading-relaxed text-ink-soft">
        Free {TRIAL_MINUTES}-minute 1-on-1 lesson. No card. You pick a time on the next screen, or
        later from your inbox. Rather chat?{" "}
        <a href={INSTAGRAM_DM_URL} className="font-semibold text-ink underline">Message us on Instagram</a>.{" "}
        <Link href="/privacy" className="underline">Privacy</Link>
      </p>
    </form>
  );
}
