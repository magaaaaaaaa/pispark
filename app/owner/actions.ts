"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  OWNER_COOKIE,
  SESSION_DAYS,
  createSessionToken,
  passwordMatches,
  verifySessionToken,
} from "@/lib/admin/session";
import { STAGES, type Stage } from "@/lib/config";
import { cancelEmail, sendEmail } from "@/lib/email/send";
import { offerEmail } from "@/lib/email/templates";
import {
  SlotTakenError,
  countRecentLoginFailures,
  getLead,
  recordLoginFailure,
  saveOwnerNotes,
  saveReminderIds,
  updateStage,
} from "@/lib/leads/repo";

export type ActionResult = { ok: true } | { ok: false; error: string };

const MIN_NOTES = 20;
const MAX_LOGIN_FAILURES = 5;
const LOCKOUT_MINUTES = 15;

/** Every action checks the session itself; the proxy redirect is only a convenience. */
async function requireOwner(): Promise<void> {
  const token = (await cookies()).get(OWNER_COOKIE)?.value;
  if (!verifySessionToken(token, process.env.SESSION_SECRET ?? "", new Date())) {
    redirect("/owner/login");
  }
}

export async function login(_prev: unknown, formData: FormData): Promise<{ error: string }> {
  const password = String(formData.get("password") ?? "");
  const secret = process.env.SESSION_SECRET ?? "";
  if (!process.env.ADMIN_PASSWORD || !secret) {
    return { error: "The owner area is not set up yet: ADMIN_PASSWORD and SESSION_SECRET are missing." };
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  try {
    const since = new Date(Date.now() - LOCKOUT_MINUTES * 60_000);
    if ((await countRecentLoginFailures(ip, since)) >= MAX_LOGIN_FAILURES) {
      return { error: `Too many attempts. Wait ${LOCKOUT_MINUTES} minutes and try again.` };
    }
  } catch (e) {
    // If the counter is unavailable the owner must still be able to get in.
    console.error("Login attempt counter unavailable", e);
  }
  if (!passwordMatches(password, process.env.ADMIN_PASSWORD)) {
    try {
      await recordLoginFailure(ip);
    } catch (e) {
      console.error("Could not record failed login", e);
    }
    return { error: "Wrong password." };
  }
  (await cookies()).set(OWNER_COOKIE, createSessionToken(secret, new Date()), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  redirect("/owner");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(OWNER_COOKIE);
  redirect("/owner/login");
}

export async function setStage(id: string, stage: Stage): Promise<ActionResult> {
  await requireOwner();
  if (!STAGES.includes(stage)) return { ok: false, error: "Unknown stage." };
  try {
    await updateStage(id, stage);
  } catch (e) {
    if (e instanceof SlotTakenError) {
      return {
        ok: false,
        error: "This lead's trial time has since been booked by someone else. Agree a new time by email first.",
      };
    }
    console.error("setStage failed", e);
    return { ok: false, error: "The stage could not be saved. Try again." };
  }
  revalidatePath("/owner");

  // A lead that is lost or parked must not keep getting "your lesson starts soon" emails.
  if (stage === "lost" || stage === "not_now") {
    const lead = await getLead(id);
    const ids = lead?.reminderIds ?? [];
    if (ids.length) {
      const results = await Promise.allSettled(ids.map((r) => cancelEmail(r)));
      const kept = ids.filter((_, i) => results[i].status === "rejected");
      try {
        await saveReminderIds(id, kept);
      } catch (e) {
        console.error("Could not update reminder ids", e);
      }
      if (kept.length) {
        return {
          ok: false,
          error: "The stage was changed, but a reminder email could not be cancelled and may still be sent. Write to the family so they are not confused.",
        };
      }
    }
  }
  return { ok: true };
}

export async function sendOffer(id: string, notes: string): Promise<ActionResult> {
  await requireOwner();
  const trimmed = notes.trim();
  if (trimmed.length < MIN_NOTES) {
    return { ok: false, error: `Write at least ${MIN_NOTES} characters about the trial before sending.` };
  }
  if (trimmed.length > 4000) return { ok: false, error: "Keep the notes under 4000 characters." };

  const lead = await getLead(id);
  if (!lead) return { ok: false, error: "This lead no longer exists." };

  try {
    await saveOwnerNotes(id, trimmed);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pispark.site";
    await sendEmail({ to: lead.email, cc: lead.parentEmail, ...offerEmail(lead, trimmed, siteUrl) });
  } catch (e) {
    console.error("sendOffer failed", e);
    return {
      ok: false,
      error: `The email was not sent (${e instanceof Error ? e.message : "unknown error"}). Your notes are saved; try again.`,
    };
  }
  try {
    await updateStage(id, "offer_sent");
  } catch (e) {
    console.error("sendOffer: stage update failed", e);
    return { ok: false, error: "The email was sent, but the stage could not be updated. Set it to “offer sent” by hand." };
  }
  revalidatePath("/owner");
  return { ok: true };
}
