import type { Metadata } from "next";
import { UnsubscribeButton } from "@/components/UnsubscribeButton";

export const metadata: Metadata = { title: "Stop emails", robots: { index: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Unsubscribe({ searchParams }: PageProps<"/unsubscribe">) {
  const token = one((await searchParams).l) ?? "";
  return (
    <section className="mx-auto max-w-xl px-5 py-16">
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Stop our emails?</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink">
        This stops the emails about booking your free trial lesson. If you have a lesson booked,
        you will still get its confirmation and reminders.
      </p>
      <UnsubscribeButton token={token} />
    </section>
  );
}
