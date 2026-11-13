"use client";

import { useEffect } from "react";
import { useConsent } from "@/lib/consent";

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown; callMethod?: (...a: unknown[]) => void };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** Loads the Meta Pixel only after the visitor allows it. */
export function MetaPixel() {
  const consent = useConsent();

  useEffect(() => {
    if (!PIXEL_ID || consent !== "granted" || window.fbq) return;
    const fbq: Fbq = (...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue!.push(args);
    };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.push = fbq;
    window.fbq = fbq;
    window._fbq = fbq;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
    fbq("init", PIXEL_ID);
    fbq("track", "PageView");
    window.dispatchEvent(new Event("pispark-pixel-ready"));
  }, [consent]);

  return null;
}
