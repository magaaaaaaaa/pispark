"use client";

import { useSyncExternalStore } from "react";

export type Consent = "granted" | "denied" | "unset";

const KEY = "pispark_consent";
const EVENT = "pispark-consent";

function read(): Consent {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : "unset";
  } catch {
    return "unset";
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setConsent(value: "granted" | "denied"): void {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // Private mode: the choice lasts for this page only.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** null on the server and during hydration, so nothing flashes. */
export function useConsent(): Consent | null {
  return useSyncExternalStore<Consent | null>(subscribe, read, () => null);
}
