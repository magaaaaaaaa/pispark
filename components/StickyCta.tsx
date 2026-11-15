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

  return (
    <>
      {/* Keeps the end of the page clear of the bar. */}
      <div aria-hidden="true" className="graph-ink h-24 sm:hidden" />
      {!formVisible && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
          <a href="#start" className="btn block px-4 py-3 text-center text-lg">
            Get my free trial lesson
          </a>
        </div>
      )}
    </>
  );
}
