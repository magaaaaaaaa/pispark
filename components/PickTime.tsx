"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CONTACT_EMAIL, TRIAL_MINUTES } from "@/lib/config";
import { suggestSlots } from "@/lib/funnel/suggest";
import { INSTAGRAM_DM_URL, MESSENGER_URL } from "@/lib/links";
import { upcomingSatDates } from "@/lib/sat-dates";

type SlotState = { status: "loading" } | { status: "ready"; slots: string[] } | { status: "failed" };

const fmt = (iso: string, tz: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone: tz, ...o }).format(new Date(iso));
const dayKey = (iso: string, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));
const dayLabel = (iso: string, tz: string) => fmt(iso, tz, { weekday: "short", month: "short", day: "numeric" });
const timeLabel = (iso: string, tz: string) => fmt(iso, tz, { hour: "numeric", minute: "2-digit" });
const fullLabel = (iso: string, tz: string) =>
  `${fmt(iso, tz, { weekday: "long", month: "long", day: "numeric" })} at ${fmt(iso, tz, { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}`;

const inputClass = "mt-1 block w-full rounded-lg border-2 border-ink bg-white px-3 py-2 text-base text-ink";
const labelClass = "block text-sm font-semibold text-ink";

/** Move keyboard and screen-reader focus to a panel when it appears. */
const focusOnMount = (el: HTMLElement | null) => el?.focus();

export function PickTime({
  token,
  firstName,
  timezone,
  currentSlot,
  preselect,
  isNew,
}: {
  token: string;
  firstName: string;
  timezone: string;
  currentSlot: string | null;
  preselect: string | null;
  isNew: boolean;
}) {
  const [slotState, setSlotState] = useState<SlotState>({ status: "loading" });
  const [booked, setBooked] = useState<string | null>(currentSlot);
  const [justBooked, setJustBooked] = useState(false);
  const [choice, setChoice] = useState<string | null>(preselect);
  const [showAll, setShowAll] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/slots")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { slots: string[] }) => !cancelled && setSlotState({ status: "ready", slots: d.slots }))
      .catch(() => !cancelled && setSlotState({ status: "failed" }));
    return () => {
      cancelled = true;
    };
  }, []);

  const slots = useMemo(() => (slotState.status === "ready" ? slotState.slots : []), [slotState]);
  const suggestions = useMemo(() => suggestSlots(slots, timezone), [slots, timezone]);
  const days = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of slots) {
      const k = dayKey(s, timezone);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()].map(([key, list]) => ({ key, label: dayLabel(list[0], timezone), slots: list }));
  }, [slots, timezone]);
  const activeDay = days.find((d) => d.key === day) ?? days[0];

  async function book(slot: string) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, slot }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok) {
        setBooked(body.slot);
        setJustBooked(true);
        setChoice(null);
        window.scrollTo({ top: 0 });
      } else if (res.status === 409 && Array.isArray(body?.slots)) {
        setSlotState({ status: "ready", slots: body.slots });
        setChoice(null);
        setNotice("That time was just taken. Here are the times still open.");
      } else {
        setChoice(null);
        setNotice(body?.message ?? `That did not go through. Try again, or email ${CONTACT_EMAIL}.`);
      }
    } catch {
      setNotice(`No connection. Check your internet and try again.`);
    }
    setBusy(false);
  }

  if (justBooked && booked) {
    return (
      <div>
        <h1 ref={focusOnMount} tabIndex={-1} className="font-display text-4xl font-extrabold tracking-tight text-ink">You’re booked, {firstName}.</h1>
        <p className="mt-4 rounded-lg border-2 border-ink bg-spark p-4 text-xl font-bold text-ink">
          {fullLabel(booked, timezone)}
        </p>
        <p className="mt-4 text-lg leading-relaxed text-ink">
          A confirmation with the video call details and a calendar invitation is on its way to
          your inbox. You will get a reminder the day before and one hour before.
        </p>
        <DetailsForm token={token} />
      </div>
    );
  }

  const heading = booked
    ? `Your trial is booked, ${firstName}.`
    : isNew
      ? `You’re in, ${firstName}. Pick a time?`
      : `Pick a time, ${firstName}.`;

  return (
    <div>
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">{heading}</h1>
      {booked ? (
        <p className="mt-3 text-lg text-ink">
          It is set for <strong>{fullLabel(booked, timezone)}</strong>. To move it, pick a new time below.
        </p>
      ) : (
        <p className="mt-3 text-lg text-ink">
          {isNew ? "We also emailed you this page, so there is no rush. " : ""}
          The trial lesson is {TRIAL_MINUTES} minutes, 1-on-1, on a video call. Times are shown in
          your time zone ({timezone.replace(/_/g, " ")}).
        </p>
      )}

      {notice && (
        <p role="alert" className="mt-4 rounded-lg border-2 border-error bg-white p-3 font-semibold text-error">
          {notice}
        </p>
      )}

      {choice && (
        <div ref={focusOnMount} tabIndex={-1} className="mt-6 rounded-lg border-2 border-ink bg-paper p-4">
          <p className="text-lg text-ink">Book this time?</p>
          <p className="mt-1 text-xl font-bold text-ink">{fullLabel(choice, timezone)}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => book(choice)}
              className="rounded-lg border-2 border-ink bg-spark px-6 py-3 text-lg font-extrabold text-ink disabled:opacity-60"
            >
              {busy ? "Booking…" : "Yes, book it"}
            </button>
            <button type="button" disabled={busy} onClick={() => setChoice(null)} className="px-3 py-3 text-base font-semibold underline">
              Choose another time
            </button>
          </div>
        </div>
      )}

      {!choice && slotState.status === "loading" && <p className="mt-6 text-ink-soft">Loading times…</p>}

      {!choice && (slotState.status === "failed" || (slotState.status === "ready" && !slots.length)) && (
        <p className="mt-6 rounded-lg border-2 border-ink bg-paper p-4 text-lg">
          {slotState.status === "failed" ? "The times could not be loaded. " : "Every time in the next two weeks is taken. "}
          Reply to the email we sent you with a couple of times that suit you and we will set it up.
        </p>
      )}

      {!choice && slots.length > 0 && (
        <>
          <div className="mt-6 grid gap-3">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setChoice(s)}
                className="rounded-lg border-2 border-ink bg-white px-4 py-4 text-left text-lg font-bold text-ink hover:bg-spark"
              >
                {fullLabel(s, timezone)}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => setShowAll((v) => !v)}
            className="mt-4 text-base font-semibold underline"
          >
            {showAll ? "Hide the other times" : "See all times"}
          </button>

          {showAll && activeDay && (
            <div className="mt-4">
              <div className="flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Day">
                {days.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    aria-pressed={d.key === activeDay.key}
                    onClick={() => setDay(d.key)}
                    className={`shrink-0 rounded-lg border-2 border-ink px-3 py-2 text-sm font-semibold ${d.key === activeDay.key ? "bg-ink text-white" : "bg-white text-ink"}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {activeDay.slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setChoice(s)}
                    className="rounded-lg border-2 border-grid bg-white px-2 py-3 text-base font-semibold text-ink hover:border-ink"
                  >
                    {timeLabel(s, timezone)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <p className="mt-8 text-base leading-relaxed text-ink-soft">
        None of these work, or you would rather talk first?{" "}
        <a href={INSTAGRAM_DM_URL} className="font-semibold text-ink underline">Message us on Instagram</a> or{" "}
        <a href={MESSENGER_URL} className="font-semibold text-ink underline">Messenger</a>, or reply to
        our email.
      </p>
    </div>
  );
}

function DetailsForm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = (k: string) => String(data.get(k) ?? "");
    const num = (k: string) => (text(k).trim() === "" ? undefined : Number(text(k)));
    setState("saving");
    try {
      const res = await fetch("/api/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          studentName: text("studentName"),
          grade: text("grade"),
          testDate: text("testDate"),
          currentScore: num("currentScore"),
          targetScore: num("targetScore"),
          message: text("message"),
        }),
      });
      setState(res.ok ? "saved" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "saved") {
    return <p className="mt-8 rounded-lg border-2 border-ink bg-paper p-4 text-lg font-semibold">Thanks. That helps us prepare.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 border-t-2 border-grid pt-6">
      <h2 className="font-display text-2xl font-extrabold text-ink">Help us prepare (optional)</h2>
      <p className="mt-1 text-base text-ink-soft">Skip anything you like. Your booking is already confirmed.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="studentName" className={labelClass}>Student’s first name</label>
          <input id="studentName" name="studentName" maxLength={80} className={inputClass} />
        </div>
        <div>
          <label htmlFor="grade" className={labelClass}>Grade</label>
          <select id="grade" name="grade" defaultValue="" className={inputClass}>
            <option value="">Choose…</option>
            <option value="9">9th</option>
            <option value="10">10th</option>
            <option value="11">11th</option>
            <option value="12">12th</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="currentScore" className={labelClass}>Latest SAT math score</label>
          <input id="currentScore" name="currentScore" type="number" inputMode="numeric" min={200} max={800} step={10} placeholder="200–800" className={inputClass} />
        </div>
        <div>
          <label htmlFor="targetScore" className={labelClass}>Score you are aiming for</label>
          <input id="targetScore" name="targetScore" type="number" inputMode="numeric" min={200} max={800} step={10} placeholder="200–800" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="testDate" className={labelClass}>Which SAT are you planning to take?</label>
          <select id="testDate" name="testDate" defaultValue="" className={inputClass}>
            <option value="">Choose…</option>
            {upcomingSatDates(new Date()).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
            <option value="Not sure yet">Not sure yet</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="message" className={labelClass}>Anything else we should know?</label>
          <textarea id="message" name="message" rows={3} maxLength={1000} className={inputClass} />
        </div>
      </div>
      {state === "error" && (
        <p role="alert" className="mt-3 font-semibold text-error">
          That did not save. If you entered scores, they need to be between 200 and 800 in steps of 10. Your booking is not affected.
        </p>
      )}
      <button type="submit" disabled={state === "saving"} className="mt-4 rounded-lg border-2 border-ink bg-ink px-5 py-3 font-bold text-white disabled:opacity-60">
        {state === "saving" ? "Saving…" : "Send details"}
      </button>
    </form>
  );
}
