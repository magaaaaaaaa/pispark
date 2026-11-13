"use client";

import Link from "next/link";
import { setConsent, useConsent } from "@/lib/consent";

export function ConsentBanner() {
  const consent = useConsent();
  // Without a Pixel there is nothing to ask about.
  if (!process.env.NEXT_PUBLIC_META_PIXEL_ID || consent !== "unset") return null;

  return (
    <div
      role="region"
      aria-label="Cookie choice"
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-ink bg-white p-4"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink">
          We would like to use a Meta cookie to see which of our posts and ads lead to bookings.
          The site works the same either way. <Link href="/privacy" className="underline">Privacy policy</Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setConsent("denied")}
            className="rounded-md border-2 border-ink px-4 py-2 text-sm font-semibold"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => setConsent("granted")}
            className="rounded-md border-2 border-ink bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
