"use client";

import { useEffect, useState } from "react";

/** A phone-only bar that keeps the offer one tap away, hidden while a sign-up form is on screen. */
export function StickyCta() {
  const [formVisible, setFormVisible] = useState(true);

  useEffect(() => {
    const forms = Array.from(document.querySelectorAll("[data-signup]"));
    if (!forms.length) return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      }
      setFormVisible(visible.size > 0);
    });
    forms.forEach((f) => observer.observe(f));
    return () => observer.disconnect();
  }, []);

  if (formVisible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-white p-3 sm:hidden">
      <a
        href="#start"
        className="block rounded-lg border-2 border-ink bg-spark px-4 py-3 text-center text-lg font-extrabold text-ink"
      >
        Get my free trial lesson
      </a>
    </div>
  );
}
