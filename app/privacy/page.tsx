import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Privacy() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <LegalPage title="Privacy policy" updated="November 13, 2026">
      <p>
        PiSpark offers online SAT math lessons. This site is run by PiSpark from Astana,
        Kazakhstan. For anything about your data, write to {mail}.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          What you type into our forms: your first name and email address, a parent&apos;s email
          if a student signs up, the lesson time you pick, and anything you choose to add
          afterwards (student&apos;s name, grade, planned test date, scores, a message).
        </li>
        <li>Your time zone, as reported by your browser, so times are shown correctly.</li>
        <li>How you reached the site, if the link you followed carried campaign tags.</li>
        <li>Your IP address at the moment you sign up, to stop automated abuse of the form.</li>
        <li>
          If you allow it in the cookie notice, a Meta cookie that records page views and
          bookings. If you decline, it is never loaded.
        </li>
      </ul>

      <h2>Why we collect it</h2>
      <ul>
        <li>To arrange and teach the trial lesson and any lessons after it.</li>
        <li>To email you confirmations, reminders and the follow-up after the trial.</li>
        <li>
          If you asked for a trial but have not picked a time, to send up to five short emails
          over two weeks about booking it. Every one has a link that stops them at once.
        </li>
        <li>To understand which posts and ads lead to bookings.</li>
      </ul>
      <p>We do not sell your data, and we do not send newsletters.</p>

      <h2>Who handles it for us</h2>
      <ul>
        <li>Vercel, which hosts this site.</li>
        <li>Supabase, which stores the booking records.</li>
        <li>Resend, which delivers our emails.</li>
        <li>Meta, only if you allowed the cookie.</li>
      </ul>
      <p>These companies may process data in the United States and other countries.</p>

      <h2>Students under 18</h2>
      <p>
        Lessons are for high school students, so most students are under 18. We ask parents to
        make the booking. When a student books, a parent&apos;s email address is required and the
        parent receives a copy of the confirmation. We do not knowingly collect data from children
        under 13. If you believe we have, write to {mail} and we will delete it.
      </p>

      <h2>How long we keep it</h2>
      <p>
        If the trial does not lead to lessons, we delete the booking record within 12 months.
        Records of paying students are kept while lessons continue and for as long afterwards as
        accounting rules require.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask to see, correct or delete your data at any time by writing to {mail}. We
        answer within 30 days. You can change your cookie choice by clearing this site&apos;s data
        in your browser, which brings the notice back.
      </p>
    </LegalPage>
  );
}
