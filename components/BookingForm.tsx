"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { TRIAL_MINUTES, CONTACT_EMAIL } from "@/lib/config";
import { UTM_STORAGE_KEY } from "@/lib/utm";

const COMMON_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

type SlotState =
  | { status: "loading" }
  | { status: "ready"; slots: string[] }
  | { status: "failed" };

const NO_SLOT = "none";

const inputClass =
  "mt-1 block w-full rounded-md border-2 border-ink bg-white px-3 py-2 text-base text-ink";
const labelClass = "block text-sm font-semibold text-ink";

function dayKey(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
function dayLabel(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));
}
function timeLabel(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

function storedUtm(): Record<string, string> {
  try {
    return JSON.parse(window.sessionStorage.getItem(UTM_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function BookingForm() {
  const router = useRouter();
  const [slotState, setSlotState] = useState<SlotState>({ status: "loading" });
  const [timezone, setTimezone] = useState("America/New_York");
  const [zones, setZones] = useState(COMMON_ZONES);
  const [role, setRole] = useState<"parent" | "student">("parent");
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser's zone is only known after mount
      setTimezone(detected);
      setZones((z) => (z.includes(detected) ? z : [detected, ...z]));
    }
    let cancelled = false;
    fetch("/api/slots")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { slots: string[] }) => {
        if (!cancelled) setSlotState({ status: "ready", slots: d.slots });
      })
      .catch(() => {
        if (!cancelled) setSlotState({ status: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const days = useMemo(() => {
    if (slotState.status !== "ready") return [];
    const map = new Map<string, string[]>();
    for (const s of slotState.slots) {
      const k = dayKey(s, timezone);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()].map(([key, slots]) => ({ key, label: dayLabel(slots[0], timezone), slots }));
  }, [slotState, timezone]);

  const activeDay = days.find((d) => d.key === day) ?? days[0];
  const noTimes = slotState.status === "failed" || (slotState.status === "ready" && days.length === 0);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    const data = new FormData(e.currentTarget);
    const text = (k: string) => String(data.get(k) ?? "");
    const num = (k: string) => (text(k).trim() === "" ? undefined : Number(text(k)));

    const chosen = noTimes ? NO_SLOT : slot;
    if (!chosen) {
      setErrors({ slot: "Pick a time, or choose “None of these times work”." });
      setNotice(null);
      return;
    }

    setSending(true);
    setErrors({});
    setNotice(null);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          contactName: text("contactName"),
          studentName: text("studentName"),
          email: text("email"),
          parentEmail: role === "student" ? text("parentEmail") : undefined,
          grade: text("grade"),
          testDate: text("testDate"),
          currentScore: num("currentScore"),
          targetScore: num("targetScore"),
          timezone,
          slot: chosen === NO_SLOT ? null : chosen,
          message: text("message"),
          source: storedUtm(),
          website: text("pispark-check"),
        }),
      });
      const body = await res.json().catch(() => null);

      if (res.ok && body?.ok) {
        router.push(body.existing ? "/thanks?existing=1" : chosen === NO_SLOT ? "/thanks?later=1" : "/thanks");
        return;
      }
      if (res.status === 409 && Array.isArray(body?.slots)) {
        setSlotState({ status: "ready", slots: body.slots });
        setSlot(null);
        setErrors({ slot: "That time was just taken. Please pick another." });
      } else if (res.status === 400 && Array.isArray(body?.issues)) {
        const next: Record<string, string> = {};
        for (const i of body.issues as { path: string; message: string }[]) next[i.path] ??= i.message;
        setErrors(next);
        setNotice("Some details need another look. They are marked below.");
      } else if (res.status === 429) {
        setNotice(`Too many bookings from this connection in the last hour. Try again later, or write to ${CONTACT_EMAIL}.`);
      } else {
        setNotice(`The booking could not be saved. Try again in a minute, or write to ${CONTACT_EMAIL}.`);
      }
    } catch {
      setNotice(`The booking could not be sent. Check your connection and try again, or write to ${CONTACT_EMAIL}.`);
    }
    setSending(false);
  }

  const err = (k: string) =>
    errors[k] ? (
      <p id={`${k}-error`} className="mt-1 text-sm font-semibold text-error">
        {errors[k]}
      </p>
    ) : null;
  const aria = (k: string) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${k}-error` } : {});

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <fieldset>
        <legend className={labelClass}>Who is booking?</legend>
        <div className="mt-2 flex gap-2">
          {(["parent", "student"] as const).map((r) => (
            <label
              key={r}
              className={`cursor-pointer rounded-md border-2 border-ink px-4 py-2 text-base font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-plot ${role === r ? "bg-ink text-white" : "bg-white text-ink"}`}
            >
              <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
              {r === "parent" ? "I am a parent" : "I am the student"}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contactName" className={labelClass}>Your name</label>
          <input id="contactName" name="contactName" required maxLength={80} autoComplete="name" className={inputClass} {...aria("contactName")} />
          {err("contactName")}
        </div>
        <div>
          <label htmlFor="studentName" className={labelClass}>
            {role === "parent" ? "Student's first name" : "Your first name"}
          </label>
          <input id="studentName" name="studentName" required maxLength={80} className={inputClass} {...aria("studentName")} />
          {err("studentName")}
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>Your email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} {...aria("email")} />
          {err("email")}
        </div>
        {role === "student" && (
          <div>
            <label htmlFor="parentEmail" className={labelClass}>A parent&apos;s email</label>
            <input id="parentEmail" name="parentEmail" type="email" required className={inputClass} {...aria("parentEmail")} />
            <p className="mt-1 text-sm text-ink-soft">We copy a parent on the confirmation.</p>
            {err("parentEmail")}
          </div>
        )}
        <div>
          <label htmlFor="grade" className={labelClass}>Grade</label>
          <select id="grade" name="grade" defaultValue="11" className={inputClass} {...aria("grade")}>
            <option value="9">9th</option>
            <option value="10">10th</option>
            <option value="11">11th</option>
            <option value="12">12th</option>
            <option value="other">Other</option>
          </select>
          {err("grade")}
        </div>
        <div>
          <label htmlFor="testDate" className={labelClass}>Planned SAT date, if you have one</label>
          <input id="testDate" name="testDate" maxLength={40} placeholder="March 2027" className={inputClass} {...aria("testDate")} />
          {err("testDate")}
        </div>
        <div>
          <label htmlFor="currentScore" className={labelClass}>Latest math score, if any</label>
          <input id="currentScore" name="currentScore" type="number" inputMode="numeric" min={200} max={800} step={10} placeholder="200–800" className={inputClass} {...aria("currentScore")} />
          {err("currentScore")}
        </div>
        <div>
          <label htmlFor="targetScore" className={labelClass}>Math score you are aiming for</label>
          <input id="targetScore" name="targetScore" type="number" inputMode="numeric" min={200} max={800} step={10} placeholder="200–800" className={inputClass} {...aria("targetScore")} />
          {err("targetScore")}
        </div>
      </div>

      <div>
        <label htmlFor="message" className={labelClass}>Anything we should know before the lesson?</label>
        <textarea id="message" name="message" rows={3} maxLength={1000} className={inputClass} {...aria("message")} />
        {err("message")}
      </div>

      {/* Hidden from people; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="pispark-check">Leave this box empty</label>
        <input id="pispark-check" name="pispark-check" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset>
        <legend className={labelClass}>Pick a time for the free {TRIAL_MINUTES}-minute trial lesson</legend>
        <div className="mt-2 max-w-xs">
          <label htmlFor="timezone" className="text-sm text-ink-soft">Times are shown in</label>
          <select id="timezone" value={timezone} onChange={(e) => { setTimezone(e.target.value); setDay(null); }} className={inputClass}>
            {zones.map((z) => (
              <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        {slotState.status === "loading" && <p className="mt-4 text-ink-soft">Loading available times…</p>}

        {noTimes && (
          <p className="mt-4 rounded-md border-2 border-ink bg-paper p-3">
            {slotState.status === "failed"
              ? "The list of times could not be loaded. Send the form anyway and we will email you within 24 hours to agree a time."
              : "Every time in the next two weeks is taken. Send the form and we will email you within 24 hours to agree a time."}
          </p>
        )}

        {slotState.status === "ready" && activeDay && (
          <>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Day">
              {days.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  aria-pressed={d.key === activeDay.key}
                  onClick={() => setDay(d.key)}
                  className={`shrink-0 rounded-md border-2 border-ink px-3 py-2 text-sm font-semibold ${d.key === activeDay.key ? "bg-ink text-white" : "bg-white text-ink"}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {activeDay.slots.map((s) => (
                <label
                  key={s}
                  className={`cursor-pointer rounded-md border-2 px-2 py-2 text-center text-sm font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-plot ${slot === s ? "border-ink bg-spark text-ink" : "border-grid bg-white text-ink hover:border-ink"}`}
                >
                  <input type="radio" name="slot" value={s} checked={slot === s} onChange={() => setSlot(s)} className="sr-only" />
                  {timeLabel(s, timezone)}
                </label>
              ))}
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-base">
              <input type="radio" name="slot" value={NO_SLOT} checked={slot === NO_SLOT} onChange={() => setSlot(NO_SLOT)} className="h-5 w-5 accent-ink" />
              None of these times work. Email me to agree a time.
            </label>
          </>
        )}
        {err("slot")}
      </fieldset>

      {notice && (
        <p role="alert" className="rounded-md border-2 border-error bg-white p-3 font-semibold text-error">
          {notice}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={sending || slotState.status === "loading"}
          className="rounded-md border-2 border-ink bg-spark px-6 py-3 text-lg font-bold text-ink disabled:opacity-60"
        >
          {sending ? "Booking…" : "Book the free trial lesson"}
        </button>
        <p className="mt-3 text-sm text-ink-soft">
          No payment details are asked for. By booking you agree to our{" "}
          <Link href="/terms" className="underline">terms</Link> and{" "}
          <Link href="/privacy" className="underline">privacy policy</Link>.
        </p>
      </div>
    </form>
  );
}
