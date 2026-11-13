"use client";

import { useEffect } from "react";

const SENT_KEY = "pispark_lead_tracked";

/** Tells the Meta Pixel a booking happened. Once per browser session, and only if the Pixel loaded. */
export function TrackLead() {
  useEffect(() => {
    const fire = () => {
      try {
        if (!window.fbq || window.sessionStorage.getItem(SENT_KEY)) return;
        window.fbq("track", "Lead");
        window.sessionStorage.setItem(SENT_KEY, "1");
      } catch {
        // Tracking is optional; never break the page for it.
      }
    };
    fire();
    window.addEventListener("pispark-pixel-ready", fire);
    return () => window.removeEventListener("pispark-pixel-ready", fire);
  }, []);
  return null;
}
