"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useBidDetail,
  usePatchBid,
  useDeleteEntity,
} from "@/lib/api";
import { useConfirmDestroy } from "@/components/confirm-destroy";

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
      </div>
      {destroy.element}
    </div>
  );
}
