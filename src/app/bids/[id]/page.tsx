"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useBidDetail,
  usePatchBid,
  useDeleteEntity,
  useCompliance,
  useCreateCompliance,
  useBulkCompliance,
  usePatchCompliance,
  useDeleteCompliance,
  useSpecs,
  COMPLIANCE_STATUSES,
  type ComplianceItem,
  type SpecItem,
} from "@/lib/api";
import { useConfirmDestroy } from "@/components/confirm-destroy";

const COMPLIANCE_BADGES: Record<string, string> = {
  compliant: "bg-emerald-50 text-emerald-700",
  partial: "bg-amber-50 text-amber-700",
  exception: "bg-red-50 text-red-700",
  not_applicable: "bg-zinc-100 text-zinc-500",
  unanswered: "bg-slate-100 text-slate-700",
};

const COMPLIANCE_LABELS: Record<string, string> = {
  compliant: "Compliant",
  partial: "Partial",
  exception: "Exception",
  not_applicable: "N/A",
  unanswered: "Unanswered",
};

const STAGE_OPTIONS = [
  "evaluating", "in_progress", "submitted", "won", "lost", "withdrawn",
] as const;

const STAGE_BADGES: Record<string, string> = {
  evaluating: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-50 text-blue-700",
  submitted: "bg-violet-50 text-violet-700",
  won: "bg-emerald-50 text-emerald-700",
  lost: "bg-red-50 text-red-600",
  withdrawn: "bg-zinc-100 text-zinc-500",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

function deadlineUrgency(deadline: string | null): string {
  if (!deadline) return "text-zinc-400";
  const daysLeft = Math.floor((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0 || daysLeft <= 7) return "text-red-600 font-semibold";
  if (daysLeft <= 30) return "text-amber-600";
  return "text-zinc-600";
}

function dateInputValue(iso: string | null): string {
  if (!iso) return "";
  // <input type="date"> wants YYYY-MM-DD in local time; ISO's date portion works.
  return iso.slice(0, 10);
}

function EditableText({
  value, placeholder, onSave, multiline = false, className = "",
}: {
  value: string;
  placeholder?: string;
  onSave: (next: string) => Promise<unknown> | unknown;
  multiline?: boolean;
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

  if (multiline) {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
        rows={4}
        className={`w-full px-1 -mx-1 text-xs bg-white border border-zinc-300 rounded focus:outline-none focus:border-zinc-500 ${className}`}
      />
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

export default function BidDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useBidDetail(id);
  const patch = usePatchBid();
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
        <p className="text-xs text-zinc-500">Bid not found.</p>
      </div>
    );
  }

  const bid = data.bid;
  const onPatch = (p: Record<string, unknown>) => patch.mutate({ id, ...p });

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link
          href="/bids"
          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 mb-4"
        >
          ← Bids
        </Link>

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-5">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200">
            <div className="min-w-0 flex-1">
              <EditableText
                value={bid.name}
                onSave={(name) => onPatch({ name })}
                className="text-base font-semibold text-zinc-900"
              />
              <div className="mt-1 text-xs text-zinc-500 flex items-center gap-2">
                {bid.company && (
                  <Link href={`/companies/${bid.company_id}`} className="hover:text-zinc-700">
                    {bid.company}
                  </Link>
                )}
                {bid.deal && (
                  <>
                    <span className="text-zinc-300">·</span>
                    <Link href={`/deals/${bid.deal_id}`} className="hover:text-zinc-700">
                      {bid.deal}
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={bid.stage}
                onChange={(e) => onPatch({ stage: e.target.value })}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border-0 cursor-pointer ${STAGE_BADGES[bid.stage] ?? "bg-slate-100 text-slate-600"}`}
              >
                {STAGE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  destroy.ask({
                    title: `Delete ${bid.name}?`,
                    body: "Removes the bid record. Linked deal/company are preserved.",
                    typeToConfirm: bid.name,
                    run: async () => {
                      await remove.mutateAsync({ entity: "bids", id });
                      router.push("/bids");
                    },
                  })
                }
                className="px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 rounded"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4 border-b border-zinc-200 text-xs">
            <div>
              <span className="text-zinc-400 text-[11px] block mb-0.5">Value</span>
              <EditableText
                value={String(bid.value_usd || 0)}
                onSave={(v) => onPatch({ value_usd: Number(v) || 0 })}
                className="text-sm font-semibold text-zinc-900 tabular-nums"
              />
              <p className="text-[11px] text-zinc-400 mt-0.5">{formatCurrency(bid.value_usd)}</p>
            </div>
            <div>
              <span className="text-zinc-400 text-[11px] block mb-0.5">Submission deadline</span>
              <input
                type="date"
                value={dateInputValue(bid.submission_deadline)}
                onChange={(e) => onPatch({ submission_deadline: e.target.value || null })}
                className={`text-xs bg-transparent border-0 cursor-pointer focus:outline-none ${deadlineUrgency(bid.submission_deadline)}`}
              />
            </div>
            <div>
              <span className="text-zinc-400 text-[11px] block mb-0.5">Q&amp;A deadline</span>
              <input
                type="date"
                value={dateInputValue(bid.qa_deadline)}
                onChange={(e) => onPatch({ qa_deadline: e.target.value || null })}
                className={`text-xs bg-transparent border-0 cursor-pointer focus:outline-none ${deadlineUrgency(bid.qa_deadline)}`}
              />
            </div>
          </div>

          <div className="py-4 border-b border-zinc-200">
            <span className="text-[11px] text-zinc-400 uppercase tracking-wide block mb-1">RFP URL</span>
            <EditableText
              value={bid.rfp_url}
              placeholder="Paste link to RFP / portal"
              onSave={(rfp_url) => onPatch({ rfp_url })}
              className="block text-zinc-700"
            />
          </div>

          <div className="py-4 border-b border-zinc-200">
            <span className="text-[11px] text-zinc-400 uppercase tracking-wide block mb-1">
              Deliverables
            </span>
            <EditableText
              value={bid.deliverables}
              placeholder="Tech proposal, BOM, schedule, compliance matrix..."
              onSave={(deliverables) => onPatch({ deliverables })}
              multiline
              className="block"
            />
          </div>

          <div className="py-4">
            <span className="text-[11px] text-zinc-400 uppercase tracking-wide block mb-1">Notes</span>
            <EditableText
              value={bid.notes}
              placeholder="Win themes, competitor intel, internal owners"
              onSave={(notes) => onPatch({ notes })}
              multiline
              className="block"
            />
          </div>
        </div>

        <ComplianceMatrix bidId={id} />
      </div>
      {destroy.element}
    </div>
  );
}

// ----- Compliance Matrix -----------------------------------------------

function ComplianceMatrix({ bidId }: { bidId: string }) {
  const { data, isLoading } = useCompliance(bidId);
  const { data: specs } = useSpecs();
  const create = useCreateCompliance(bidId);
  const bulk = useBulkCompliance(bidId);
  const items = data?.items ?? [];
  const summary = data?.summary;
  const total = data?.total ?? 0;

  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [adding, setAdding] = useState(false);
  const [section, setSection] = useState("");
  const [clauseText, setClauseText] = useState("");

  const submitBulk = async () => {
    if (!bulkText.trim()) return;
    await bulk.mutateAsync(bulkText);
    setBulkText("");
    setBulkMode(false);
  };

  const submitOne = async () => {
    if (!clauseText.trim()) return;
    await create.mutateAsync({
      clause_section: section.trim(),
      clause_text: clauseText.trim(),
    });
    setSection(""); setClauseText("");
    setAdding(false);
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-5 mt-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
            Compliance matrix
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Per-clause RFP responses. Procurement scores this document — a single non-compliant line can disqualify the bid.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {!bulkMode && !adding && (
            <>
              <button
                type="button"
                onClick={() => setBulkMode(true)}
                className="px-2.5 py-1 text-[11px] font-medium text-zinc-700 bg-white border border-zinc-200 rounded hover:bg-zinc-50"
              >
                Paste RFP
              </button>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="px-2.5 py-1 text-[11px] font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800"
              >
                + Clause
              </button>
            </>
          )}
        </div>
      </div>

      {summary && total > 0 && (
        <div className="flex items-center gap-3 mb-3 text-[11px] flex-wrap">
          {COMPLIANCE_STATUSES.map((s) => {
            const n = summary[s] ?? 0;
            if (n === 0) return null;
            return (
              <div key={s} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${COMPLIANCE_BADGES[s].split(" ")[0].replace("bg-", "bg-")}`} />
                <span className="text-zinc-600 tabular-nums">
                  {n} {COMPLIANCE_LABELS[s].toLowerCase()}
                </span>
              </div>
            );
          })}
          <span className="ml-auto text-zinc-400 tabular-nums">{total} total</span>
        </div>
      )}

      {bulkMode && (
        <div className="bg-zinc-50 border border-zinc-200 rounded p-2 mb-3 space-y-1.5">
          <p className="text-[11px] text-zinc-500">
            Paste the RFP&apos;s clause list. Lines starting with a section number (e.g. &quot;4.2.1 ...&quot;) are auto-parsed.
          </p>
          <textarea
            autoFocus
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={6}
            placeholder={`4.2.1 All field-mounted equipment must be ATEX certified.\n4.2.2 SIL-2 rating required for safety-critical loops.\n4.3.1 IEC 62443-3-2 zone & conduit drawing required.`}
            className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 font-mono"
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={submitBulk}
              disabled={bulk.isPending || !bulkText.trim()}
              className="px-3 py-1 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50"
            >
              {bulk.isPending ? "Importing..." : `Import ${bulkText.split("\n").filter((l) => l.trim()).length} clauses`}
            </button>
            <button
              type="button"
              onClick={() => { setBulkMode(false); setBulkText(""); }}
              className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {adding && (
        <div className="bg-zinc-50 border border-zinc-200 rounded p-2 mb-3 space-y-1.5">
          <input
            autoFocus
            type="text"
            placeholder="Section (e.g. 4.2.1)"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
          />
          <textarea
            placeholder="Clause text from RFP"
            value={clauseText}
            onChange={(e) => setClauseText(e.target.value)}
            rows={2}
            className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={submitOne}
              disabled={create.isPending || !clauseText.trim()}
              className="px-3 py-1 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50"
            >
              Add clause
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-zinc-400 py-3 text-center">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-zinc-400 py-4 text-center">
          No compliance clauses yet. Paste an RFP to get started.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-[11px] text-zinc-400 uppercase tracking-wider">
                <th className="py-1.5 pr-3 font-medium w-16">§</th>
                <th className="py-1.5 pr-3 font-medium">Clause</th>
                <th className="py-1.5 pr-3 font-medium">Our response</th>
                <th className="py-1.5 pr-3 font-medium w-28">Status</th>
                <th className="py-1.5 pr-3 font-medium w-28">Specs</th>
                <th className="py-1.5 w-6" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <ComplianceRow key={it.id} item={it} bidId={bidId} specs={specs ?? []} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ComplianceRow({
  item, bidId, specs,
}: {
  item: ComplianceItem;
  bidId: string;
  specs: SpecItem[];
}) {
  const patch = usePatchCompliance(bidId);
  const remove = useDeleteCompliance(bidId);
  const specsById = Object.fromEntries(specs.map((s) => [s.id, s]));
  const [showSpecPicker, setShowSpecPicker] = useState(false);

  const toggleSpec = (specId: string) => {
    const has = item.spec_ids.includes(specId);
    const next = has
      ? item.spec_ids.filter((s) => s !== specId)
      : [...item.spec_ids, specId];
    patch.mutate({ id: item.id, spec_ids: next });
  };

  return (
    <tr className="border-b border-zinc-100 last:border-0 align-top group">
      <td className="py-2 pr-3 font-mono text-[11px] text-zinc-500">{item.clause_section}</td>
      <td className="py-2 pr-3">
        <EditableText
          value={item.clause_text}
          onSave={(clause_text) => patch.mutateAsync({ id: item.id, clause_text })}
          multiline
          className="block leading-relaxed"
        />
      </td>
      <td className="py-2 pr-3">
        <EditableText
          value={item.our_response}
          placeholder="Draft response..."
          onSave={(our_response) => patch.mutateAsync({ id: item.id, our_response })}
          multiline
          className="block leading-relaxed"
        />
      </td>
      <td className="py-2 pr-3">
        <select
          value={item.status}
          onChange={(e) => patch.mutate({ id: item.id, status: e.target.value })}
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase border-0 cursor-pointer ${COMPLIANCE_BADGES[item.status]}`}
        >
          {COMPLIANCE_STATUSES.map((s) => (
            <option key={s} value={s}>{COMPLIANCE_LABELS[s]}</option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-3 relative">
        <div className="flex flex-wrap gap-1">
          {item.spec_ids.map((sid) => {
            const sp = specsById[sid];
            return (
              <span
                key={sid}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700 cursor-pointer"
                title={sp?.name}
                onClick={() => toggleSpec(sid)}
              >
                {sp?.code ?? sid.slice(0, 6)}
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => setShowSpecPicker((v) => !v)}
            className="px-1.5 py-0.5 rounded text-[10px] text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
          >
            +
          </button>
        </div>
        {showSpecPicker && (
          <div
            className="absolute right-0 top-full mt-1 z-10 bg-white border border-zinc-200 rounded shadow-lg p-1 w-56 max-h-64 overflow-y-auto"
            onMouseLeave={() => setShowSpecPicker(false)}
          >
            {specs.length === 0 && (
              <p className="text-[11px] text-zinc-400 px-2 py-1.5">
                No specs in library yet. Add them in /specs.
              </p>
            )}
            {specs.map((sp) => {
              const selected = item.spec_ids.includes(sp.id);
              return (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => toggleSpec(sp.id)}
                  className={`w-full text-left px-2 py-1 rounded text-[11px] hover:bg-zinc-50 flex items-center gap-2 ${selected ? "bg-violet-50/50" : ""}`}
                >
                  <span className="font-mono text-zinc-700 w-20 truncate">{sp.code}</span>
                  <span className="text-zinc-500 truncate">{sp.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </td>
      <td className="py-2 text-right">
        <button
          type="button"
          onClick={() => remove.mutate(item.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-600 px-1"
        >
          ×
        </button>
      </td>
    </tr>
  );
}
