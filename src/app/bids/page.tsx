"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Plus, Loader2 } from "lucide-react";
import { useBidsList, useCreateBid, useCompanies } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";

const STAGE_OPTIONS = [
  { value: "", label: "All" },
  { value: "evaluating", label: "Evaluating" },
  { value: "in_progress", label: "In progress" },
  { value: "submitted", label: "Submitted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
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
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value.toLocaleString()}`;
}

// Color-coded countdown — the whole point of this page is "what's about to be
// late". <0 is overdue (red), <7d critical (red), <30d warn (amber), else
// neutral. Industrial RFPs slip a fiscal quarter routinely; the UI should
// scream when one's burning.
function deadlineLabel(deadline: string | null): { text: string; cls: string } {
  if (!deadline) return { text: "—", cls: "text-zinc-400" };
  const now = Date.now();
  const due = new Date(deadline).getTime();
  const daysLeft = Math.floor((due - now) / (1000 * 60 * 60 * 24));
  const dateStr = new Date(deadline).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
  if (daysLeft < 0) {
    return { text: `${dateStr} (${-daysLeft}d late)`, cls: "text-red-600 font-semibold" };
  }
  if (daysLeft <= 7) {
    return { text: `${dateStr} (${daysLeft}d)`, cls: "text-red-600 font-semibold" };
  }
  if (daysLeft <= 30) {
    return { text: `${dateStr} (${daysLeft}d)`, cls: "text-amber-600" };
  }
  return { text: `${dateStr} (${daysLeft}d)`, cls: "text-zinc-500" };
}

export default function BidsPage() {
  const [stage, setStage] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [value, setValue] = useState("");
  const [deadline, setDeadline] = useState("");
  const [bidStage, setBidStage] = useState("evaluating");

  const { data, isLoading } = useBidsList(stage || undefined);
  const { data: companies } = useCompanies();
  const create = useCreateBid();
  const bids = data ?? [];

  const submit = async () => {
    if (!name.trim()) return;
    await create.mutateAsync({
      name: name.trim(),
      company_id: companyId || null,
      stage: bidStage,
      value_usd: Number(value) || 0,
      submission_deadline: deadline || null,
    });
    setName(""); setCompanyId(""); setValue(""); setDeadline(""); setBidStage("evaluating");
    setAdding(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-sm font-semibold text-zinc-800">Bids / RFPs</h1>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 tabular-nums hidden sm:inline">
              {bids.length} {bids.length === 1 ? "bid" : "bids"}
            </span>
            {bids.length > 0 && (
              <button
                type="button"
                onClick={() => downloadCsv(`bids-${new Date().toISOString().slice(0, 10)}`, bids, [
                  { key: "name", header: "Name" },
                  { key: "company", header: "Company" },
                  { key: "stage", header: "Stage" },
                  { key: "value_usd", header: "Value (USD)" },
                  { key: "submission_deadline", header: "Submission deadline" },
                  { key: "qa_deadline", header: "Q&A deadline" },
                  { key: "deal", header: "Deal" },
                  { key: "rfp_url", header: "RFP URL" },
                ])}
                className="px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-100 rounded border border-zinc-200"
              >
                CSV
              </button>
            )}
            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800"
              >
                <Plus size={12} />
                New
              </button>
            )}
          </div>
        </div>

        {/* Stage filter */}
        <div className="flex items-center gap-0.5 bg-white border border-zinc-200 rounded-lg p-0.5 mb-3 w-fit">
          {STAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStage(opt.value)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                stage === opt.value
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {adding && (
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-3 mb-3 space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-zinc-700">New bid</span>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="text-[11px] text-zinc-400 hover:text-zinc-600"
              >
                Cancel
              </button>
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Bid name (e.g. RFP-2026-Q2 DCS Migration)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
            />
            <div className="grid grid-cols-3 gap-1.5">
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              >
                <option value="">No company</option>
                {(companies ?? []).map((co) => (
                  <option key={co.id} value={co.id}>{co.name}</option>
                ))}
              </select>
              <select
                value={bidStage}
                onChange={(e) => setBidStage(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              >
                <option value="evaluating">Evaluating</option>
                <option value="in_progress">In progress</option>
                <option value="submitted">Submitted</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
              <input
                type="number"
                placeholder="$ value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              />
            </div>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              placeholder="Submission deadline"
            />
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending || !name.trim()}
              className="w-full py-1 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50"
            >
              {create.isPending ? "Creating..." : "Create bid"}
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_120px_140px_60px] gap-3 px-4 py-2 border-b border-zinc-200 text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
            <div>Bid</div>
            <div>Company</div>
            <div>Stage</div>
            <div>Deadline</div>
            <div className="text-right">Value</div>
          </div>
          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 size={16} className="inline animate-spin text-zinc-400" />
            </div>
          ) : bids.length === 0 ? (
            <div className="py-8 text-center">
              <FileText size={20} className="inline text-zinc-300 mb-2" />
              <p className="text-xs text-zinc-400">No bids in this view.</p>
            </div>
          ) : (
            bids.map((b) => {
              const dl = deadlineLabel(b.submission_deadline);
              return (
                <Link
                  key={b.id}
                  href={`/bids/${b.id}`}
                  className="grid grid-cols-[1fr_140px_120px_140px_60px] gap-3 px-4 py-2 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors text-xs items-center"
                >
                  <div className="min-w-0">
                    <p className="text-zinc-800 font-medium truncate">{b.name}</p>
                    {b.deal && (
                      <p className="text-[11px] text-zinc-400 truncate">↳ {b.deal}</p>
                    )}
                  </div>
                  <div className="text-zinc-600 truncate">{b.company || "—"}</div>
                  <div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${STAGE_BADGES[b.stage] ?? "bg-slate-100 text-slate-600"}`}>
                      {b.stage.replace("_", " ")}
                    </span>
                  </div>
                  <div className={`text-[11px] tabular-nums ${dl.cls}`}>{dl.text}</div>
                  <div className="text-right text-zinc-600 tabular-nums">
                    {formatCurrency(b.value_usd)}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
