import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Mynerve, Public_Sans, Shadows_Into_Light_Two, STIX_Two_Text } from "next/font/google";
import Link from "next/link";
import { ConsentBanner } from "@/components/ConsentBanner";
import { MetaPixel } from "@/components/MetaPixel";
import { UtmCapture } from "@/components/UtmCapture";
import { CONTACT_EMAIL, DISCLAIMER } from "@/lib/config";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const publicSans = Public_Sans({ variable: "--font-public", subsets: ["latin"] });
const stix = STIX_Two_Text({ variable: "--font-stix", subsets: ["latin"], style: ["normal", "italic"], weight: ["400"] });
/** The teacher's red pen, and the student's pencil. */
const mynerve = Mynerve({ variable: "--font-mynerve", subsets: ["latin"], weight: ["400"] });
const shadows = Shadows_Into_Light_Two({ variable: "--font-shadows", subsets: ["latin"], weight: ["400"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pispark.site";

/** Edge to edge on notched phones; the bottom bar keeps clear of the home indicator. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

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
    <html lang="en" className={`${bricolage.variable} ${publicSans.variable} ${stix.variable} ${mynerve.variable} ${shadows.variable} antialiased`}>
      <body className="flex min-h-screen flex-col">
        {/* Roughens pen strokes so they look drawn, not plotted. */}
        <svg aria-hidden="true" width="0" height="0" className="absolute">
          <filter id="rough" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
          </filter>
        </svg>
        <header className="z-30 border-b-2 border-ink bg-white sm:sticky sm:top-0">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-2.5">
            <Link href="/" className="-my-2 inline-block py-2 font-display text-2xl font-extrabold tracking-tight text-ink">
              <span className="math not-italic font-normal">π</span>Spark
            </Link>
            <Link
              href="/book_a_lesson"
              className="btn hidden px-4 py-2.5 text-sm sm:inline-block"
            >
              Free trial lesson
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t-2 border-ink bg-white">
          <div className="mx-auto max-w-6xl space-y-2 px-5 py-6 text-sm text-ink-soft">
            <p>
              PiSpark, Astana, Kazakhstan.{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
            </p>
            <p>
              <Link href="/privacy" className="inline-block py-2 underline">Privacy policy</Link>{" "}
              <Link href="/terms" className="ml-5 inline-block py-2 underline">Terms</Link>
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
