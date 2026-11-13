import Link from "next/link";
import { STAGE_LABELS, ownerTime, requireOwnerPage } from "@/lib/admin/guard";
import { STAGES } from "@/lib/config";
import { listLeads } from "@/lib/leads/repo";
import type { Lead } from "@/lib/leads/schema";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

const source = (l: Lead) =>
  [l.source.utmSource, l.source.utmMedium, l.source.utmCampaign].filter(Boolean).join(" / ") || "direct";

export default async function OwnerHome() {
  await requireOwnerPage();

  let leads: Lead[] = [];
  let loadError: string | null = null;
  try {
    leads = await listLeads();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold text-ink">Leads</h1>
        <form action={logout}>
          <button type="submit" className="text-sm font-semibold underline">Sign out</button>
        </form>
      </div>

      {loadError ? (
        <p role="alert" className="mt-6 rounded-md border-2 border-error bg-white p-4 font-semibold text-error">
          Leads could not be loaded: {loadError}
        </p>
      ) : (
        <>
          <dl className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {STAGES.map((s) => (
              <div key={s} className="rounded-md border-2 border-grid bg-white p-3">
                <dt className="text-sm text-ink-soft">{STAGE_LABELS[s]}</dt>
                <dd className="font-display text-2xl font-extrabold text-ink">
                  {leads.filter((l) => l.stage === s).length}
                </dd>
              </div>
            ))}
          </dl>

          {leads.length === 0 ? (
            <p className="mt-8 text-lg text-ink-soft">
              No leads yet. When a family books a trial lesson it appears here.
            </p>
          ) : (
            <div className="mt-8 overflow-x-auto rounded-md border-2 border-ink bg-white">
              <table className="w-full text-left text-base">
                <thead className="border-b-2 border-ink text-sm text-ink-soft">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Stage</th>
                    <th className="p-3">Trial (Astana time)</th>
                    <th className="p-3">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grid">
                  {leads.map((l) => (
                    <tr key={l.id}>
                      <td className="p-3">
                        <Link href={`/owner/leads/${l.id}`} className="font-semibold underline">
                          {l.contactName}
                        </Link>
                        {l.emailError && (
                          <span className="ml-2 rounded bg-error px-1.5 py-0.5 text-xs font-bold text-white" title={l.emailError}>
                            email failed
                          </span>
                        )}
                      </td>
                      <td className="p-3">{STAGE_LABELS[l.stage]}</td>
                      <td className="p-3">{l.slot ? ownerTime(l.slot) : "No time picked yet"}</td>
                      <td className="p-3 text-ink-soft">{source(l)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
