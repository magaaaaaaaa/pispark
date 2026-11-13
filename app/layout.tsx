import type { Metadata } from "next";
import { Bricolage_Grotesque, Public_Sans, STIX_Two_Text } from "next/font/google";
import Link from "next/link";
import { ConsentBanner } from "@/components/ConsentBanner";
import { MetaPixel } from "@/components/MetaPixel";
import { UtmCapture } from "@/components/UtmCapture";
import { CONTACT_EMAIL, DISCLAIMER } from "@/lib/config";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const publicSans = Public_Sans({ variable: "--font-public", subsets: ["latin"] });
const stix = STIX_Two_Text({ variable: "--font-stix", subsets: ["latin"], style: ["italic"], weight: ["400"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pispark.site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "PiSpark — 1-on-1 live SAT math lessons", template: "%s — PiSpark" },
  description:
    "Live 1-on-1 SAT math lessons online for grades 10–12. Start with a free 25-minute trial lesson.",
  openGraph: {
    title: "PiSpark — 1-on-1 live SAT math lessons",
    description: "Live 1-on-1 SAT math lessons online. Start with a free 25-minute trial lesson.",
    url: SITE_URL,
    siteName: "PiSpark",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${publicSans.variable} ${stix.variable} antialiased`}>
      <body className="flex min-h-screen flex-col">
        <header className="border-b-2 border-ink bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
            <Link href="/" className="font-display text-2xl font-extrabold tracking-tight text-ink">
              <span className="math not-italic font-normal">π</span>Spark
            </Link>
            <Link
              href="/book_a_lesson"
              className="rounded-md border-2 border-ink bg-spark px-4 py-2 text-sm font-bold text-ink"
            >
              Book a free trial
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t-2 border-ink bg-white">
          <div className="mx-auto max-w-5xl space-y-2 px-5 py-6 text-sm text-ink-soft">
            <p>
              PiSpark, Astana, Kazakhstan.{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
            </p>
            <p>
              <Link href="/privacy" className="underline">Privacy policy</Link>{" "}
              <Link href="/terms" className="ml-3 underline">Terms</Link>
            </p>
            <p>{DISCLAIMER}</p>
          </div>
        </footer>
        <UtmCapture />
        <MetaPixel />
        <ConsentBanner />
      </body>
    </html>
  );
}
