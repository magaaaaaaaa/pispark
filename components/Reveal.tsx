"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Marks its children as seen (data-in="true") the first time they scroll into
 * view. The pen strokes, handwriting and bars inside are animated from CSS.
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "ul" | "ol" | "li" | "figure" | "span";
}) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Seen once its top is a fifth of the way up the screen.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    // @ts-expect-error one ref type for several plain elements
    <Tag ref={ref} data-in={seen} className={className}>
      {children}
    </Tag>
  );
}
