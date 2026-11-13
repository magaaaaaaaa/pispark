"use client";

import { useEffect } from "react";
import { UTM_STORAGE_KEY, readUtm } from "@/lib/utm";

/** Remembers how the visitor arrived, so the booking can record it. First touch wins. */
export function UtmCapture() {
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(UTM_STORAGE_KEY)) return;
      const utm = readUtm(window.location.search);
      if (Object.keys(utm).length) {
        window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
      }
    } catch {
      // Storage blocked: the booking is simply recorded as a direct visit.
    }
  }, []);
  return null;
}
