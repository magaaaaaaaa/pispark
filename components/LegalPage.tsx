import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-soft">Last updated {updated}</p>
      <div className="mt-8 space-y-4 text-lg leading-relaxed text-ink [&_a]:underline [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_li]:ml-6 [&_li]:list-disc">
        {children}
      </div>
    </article>
  );
}
