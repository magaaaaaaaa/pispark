import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OWNER_COOKIE, verifySessionToken } from "./session";

/** For owner pages: redirect to sign-in unless the session cookie is valid. */
export async function requireOwnerPage(): Promise<void> {
  const token = (await cookies()).get(OWNER_COOKIE)?.value;
  if (!verifySessionToken(token, process.env.SESSION_SECRET ?? "", new Date())) {
    redirect("/owner/login");
  }
}

export const STAGE_LABELS = {
  new: "New, no time yet",
  trial_booked: "Trial booked",
  trial_done: "Trial done",
  offer_sent: "Offer sent",
  paying: "Paying",
  not_now: "Not now",
  lost: "Lost",
} as const;

/** Trial time as the owner sees it, in Astana. */
export function ownerTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Almaty",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
