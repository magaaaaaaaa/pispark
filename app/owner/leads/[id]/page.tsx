import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadControls } from "@/components/LeadControls";
import { STAGE_LABELS, ownerTime, requireOwnerPage } from "@/lib/admin/guard";
import { formatLocal } from "@/lib/email/templates";
import { getLead } from "@/lib/leads/repo";

export const dynamic = "force-dynamic";

export default async function LeadPage({ params }: PageProps<"/owner/leads/[id]">) {
  await requireOwnerPage();
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const rows: [string, string][] = [
    ["Trial, your time", lead.slot ? ownerTime(lead.slot) : "No time chosen. Email them to agree one."],
    ["Trial, their time", lead.slot ? formatLocal(lead.slot, lead.timezone) : "-"],
    ["Booked by", `${lead.contactName} (${lead.role})`],
    ["Email", lead.email],
    ["Parent email", lead.parentEmail ?? "-"],
    ["Grade", lead.grade],
    ["Planned test date", lead.testDate ?? "not given"],
    ["Current math score", lead.currentScore?.toString() ?? "not given"],
    ["Target math score", lead.targetScore?.toString() ?? "not given"],
    ["Time zone", lead.timezone],
    ["Source", [lead.source.utmSource, lead.source.utmMedium, lead.source.utmCampaign, lead.source.utmContent].filter(Boolean).join(" / ") || "direct"],
    ["Message", lead.message ?? "-"],
    ["Booked on", ownerTime(lead.createdAt)],
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p><Link href="/owner" className="text-sm font-semibold underline">All leads</Link></p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">{lead.studentName}</h1>

      {lead.emailError && (
        <p role="alert" className="mt-4 rounded-md border-2 border-error bg-white p-3 text-error">
          <strong>An automatic email to this family failed.</strong> Write to them yourself so they
          have the lesson details. Details: {lead.emailError}
        </p>
      )}

      <dl className="mt-6 divide-y divide-grid rounded-md border-2 border-ink bg-white">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[10rem_1fr] gap-3 p-3">
            <dt className="text-sm text-ink-soft">{k}</dt>
            <dd className="whitespace-pre-wrap break-words text-base text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4">
        <a href={`mailto:${lead.email}`} className="font-semibold underline">Write to {lead.contactName}</a>
      </p>

      <div className="mt-8">
        <LeadControls id={lead.id} stage={lead.stage} notes={lead.ownerNotes ?? ""} labels={STAGE_LABELS} />
      </div>
    </div>
  );
}
