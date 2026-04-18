"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCompanyDetail,
  usePatchCompany,
  useDeleteEntity,
} from "@/lib/api";
import { useConfirmDestroy } from "@/components/confirm-destroy";

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value.toLocaleString()}`;
}

function formatDate(d: string | null) {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STAGE_BADGES: Record<string, string> = {
  prospect: "bg-slate-100 text-slate-700",
  qualified: "bg-blue-50 text-blue-700",
  proposal: "bg-violet-50 text-violet-700",
  negotiation: "bg-amber-50 text-amber-700",
  closed_won: "bg-emerald-50 text-emerald-700",
  closed_lost: "bg-red-50 text-red-700",
};

const BID_BADGES: Record<string, string> = {
  evaluating: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-50 text-blue-700",
  submitted: "bg-violet-50 text-violet-700",
  won: "bg-emerald-50 text-emerald-700",
  lost: "bg-red-50 text-red-600",
  withdrawn: "bg-zinc-100 text-zinc-500",
};

function EditableText({
  value,
  placeholder,
  onSave,
  className = "",
}: {
  value: string;
  placeholder?: string;
  onSave: (next: string) => Promise<unknown> | unknown;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = async () => {
    if (draft !== value) await onSave(draft);
    setEditing(false);
  };

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={() => { setDraft(value); setEditing(true); }}
        className={`cursor-text rounded hover:bg-zinc-100/70 px-1 -mx-1 ${value ? "text-zinc-700" : "text-zinc-400 italic"} ${className}`}
      >
        {value || placeholder || "Click to add"}
      </span>
    );
  }
  return (
    <input
      autoFocus
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      }}
      className={`w-full px-1 -mx-1 text-xs bg-white border border-zinc-300 rounded focus:outline-none focus:border-zinc-500 ${className}`}
    />
  );
}

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useCompanyDetail(id);
  const patch = usePatchCompany();
  const remove = useDeleteEntity();
  const destroy = useConfirmDestroy();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-xs text-zinc-400">Loading...</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-xs text-zinc-500">Company not found.</p>
      </div>
    );
  }

  const { company, stats, deals, contacts, bids, recent_meetings, recent_actions } = data;
  const onPatch = (p: Record<string, unknown>) => patch.mutate({ id, ...p });

  const askDelete = () =>
    destroy.ask({
      title: `Delete ${company.name}?`,
      body: "This will cascade-delete all deals, contacts, and bids attached to this company. The bot will lose all knowledge of this account.",
      typeToConfirm: company.name,
      run: async () => {
        await remove.mutateAsync({ entity: "companies", id });
        router.push("/companies");
      },
    });

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link
          href="/companies"
          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 mb-4"
        >
          ← Companies
        </Link>

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-5 mb-4">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200">
            <div className="min-w-0 flex-1">
              <EditableText
                value={company.name}
                onSave={(name) => onPatch({ name })}
                className="text-base font-semibold text-zinc-900"
              />
              <div className="mt-1 flex items-center gap-3 text-xs">
                <EditableText
                  value={company.industry}
                  placeholder="Add industry"
                  onSave={(industry) => onPatch({ industry })}
                  className="text-zinc-500"
                />
                <EditableText
                  value={company.website}
                  placeholder="website.com"
                  onSave={(website) => onPatch({ website })}
                  className="text-zinc-500"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={askDelete}
              className="px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 rounded"
            >
              Delete
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-zinc-200">
            <Stat label="Active deals" value={String(stats.deal_count)} />
            <Stat label="Pipeline" value={formatCurrency(stats.active_pipeline_value)} />
            <Stat label="Won" value={formatCurrency(stats.won_value)} />
            <Stat label="Open bids" value={String(stats.open_bid_count)} />
          </div>

          <div className="py-4">
            <span className="text-[11px] text-zinc-400 uppercase tracking-wide block mb-1">Notes</span>
            <EditableText
              value={company.notes}
              placeholder="Account notes — relationships, history, parent-co context"
              onSave={(notes) => onPatch({ notes })}
              className="block w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title={`Deals (${deals.length})`}>
            {deals.length === 0 ? (
              <p className="text-xs text-zinc-400 py-2">No deals yet.</p>
            ) : (
              deals.map((d) => (
                <Link
                  key={d.id}
                  href={`/deals/${d.id}`}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-zinc-50 rounded text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STAGE_BADGES[d.stage] ?? "bg-slate-100 text-slate-600"}`}>
                      {d.stage.replace("_", " ")}
                    </span>
                    <span className="text-zinc-800 truncate">{d.name}</span>
                  </div>
                  <span className="text-zinc-500 tabular-nums shrink-0">
                    {formatCurrency(d.value_usd)}
                  </span>
                </Link>
              ))
            )}
          </Section>

          <Section title={`Bids (${bids.length})`}>
            {bids.length === 0 ? (
              <p className="text-xs text-zinc-400 py-2">No bids tracked.</p>
            ) : (
              bids.map((b) => (
                <Link
                  key={b.id}
                  href={`/bids/${b.id}`}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-zinc-50 rounded text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${BID_BADGES[b.stage] ?? "bg-slate-100 text-slate-600"}`}>
                      {b.stage.replace("_", " ")}
                    </span>
                    <span className="text-zinc-800 truncate">{b.name}</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 tabular-nums shrink-0">
                    {b.submission_deadline ? formatDate(b.submission_deadline) : formatCurrency(b.value_usd)}
                  </span>
                </Link>
              ))
            )}
          </Section>

          <Section title={`Contacts (${contacts.length})`}>
            {contacts.length === 0 ? (
              <p className="text-xs text-zinc-400 py-2">No contacts.</p>
            ) : (
              contacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-2 px-2 py-1.5 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-zinc-800 font-medium truncate">{c.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {c.title}
                      {c.title && c.email && " · "}
                      {c.email}
                    </p>
                  </div>
                </div>
              ))
            )}
          </Section>

          <Section title="Recent activity">
            {recent_meetings.length === 0 && recent_actions.length === 0 ? (
              <p className="text-xs text-zinc-400 py-2">No recent activity.</p>
            ) : (
              <>
                {recent_meetings.slice(0, 5).map((m) => (
                  <div key={m.id} className="px-2 py-1 text-xs">
                    <span className="text-[11px] text-zinc-400 tabular-nums mr-2">
                      {formatDate(m.date)}
                    </span>
                    <span className="text-zinc-700">
                      Meeting{m.summary ? `: ${m.summary.slice(0, 80)}` : ""}
                    </span>
                  </div>
                ))}
                {recent_actions.slice(0, 5).map((a) => (
                  <div key={a.id} className="px-2 py-1 text-xs">
                    <span className="text-[11px] text-zinc-400 mr-2">{a.status}</span>
                    <span className="text-zinc-700">{a.description}</span>
                  </div>
                ))}
              </>
            )}
          </Section>
        </div>
      </div>
      {destroy.element}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-zinc-900 tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-3">
      <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-2 px-1">
        {title}
      </h2>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
