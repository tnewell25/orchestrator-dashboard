"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, Plus } from "lucide-react";
import {
  useWinLoss,
  useCreateWinLoss,
  useDeleteEntity,
  useSearch,
} from "@/lib/api";
import { useConfirmDestroy } from "@/components/confirm-destroy";

function fmt$(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v.toLocaleString()}`;
}

export default function WinLossPage() {
  const { data, isLoading } = useWinLoss();
  const create = useCreateWinLoss();
  const remove = useDeleteEntity();
  const destroy = useConfirmDestroy();

  const [adding, setAdding] = useState(false);
  const [dealQuery, setDealQuery] = useState("");
  const [dealId, setDealId] = useState("");
  const [dealName, setDealName] = useState("");
  const [outcome, setOutcome] = useState<"won" | "lost" | "no_decision">("won");
  const [winningCompetitor, setWinningCompetitor] = useState("");
  const [primaryReason, setPrimaryReason] = useState("");
  const [whatWorked, setWhatWorked] = useState("");
  const [whatDidnt, setWhatDidnt] = useState("");
  const [lessons, setLessons] = useState("");
  const [value, setValue] = useState("");

  const { data: searchResults } = useSearch(dealQuery);
  const dealMatches = (searchResults ?? []).filter((r) => r.kind === "deal");

  const stats = data?.stats;
  const records = data?.records ?? [];

  const submit = async () => {
    if (!dealId) return;
    await create.mutateAsync({
      deal_id: dealId, outcome,
      winning_competitor: winningCompetitor,
      primary_reason: primaryReason,
      what_worked: whatWorked, what_didnt: whatDidnt, lessons,
      value_usd: Number(value) || 0,
    });
    setDealId(""); setDealName(""); setOutcome("won");
    setWinningCompetitor(""); setPrimaryReason("");
    setWhatWorked(""); setWhatDidnt(""); setLessons(""); setValue("");
    setAdding(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-zinc-800">Win/Loss</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5 hidden sm:block">
              Post-mortem records. The pattern in why deals are won + lost is more valuable than any individual deal.
            </p>
          </div>
          {!adding && (
            <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 shrink-0">
              <Plus size={12} />
              Record
            </button>
          )}
        </div>

        {stats && stats.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <StatCard label="Records" value={String(stats.total)} />
            <StatCard label="Win rate" value={`${Math.round(stats.win_rate * 100)}%`} tone="emerald" />
            <StatCard label="Won value" value={fmt$(stats.won_value)} tone="emerald" />
            <StatCard label="Lost value" value={fmt$(stats.lost_value)} tone="red" />
          </div>
        )}

        {adding && (
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-3 mb-3 space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-zinc-700">New record</span>
              <button type="button" onClick={() => setAdding(false)} className="text-[11px] text-zinc-400 hover:text-zinc-600">Cancel</button>
            </div>

            {!dealId ? (
              <div className="relative">
                <input autoFocus type="text" placeholder="Search for the deal..." value={dealQuery} onChange={(e) => setDealQuery(e.target.value)} className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
                {dealQuery && dealMatches.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-0.5 z-10 bg-white border border-zinc-200 rounded shadow-md max-h-48 overflow-y-auto">
                    {dealMatches.slice(0, 8).map((d) => (
                      <button key={d.id} type="button" onClick={() => { setDealId(d.id); setDealName(d.title); setDealQuery(""); }} className="w-full text-left px-2 py-1.5 text-xs hover:bg-zinc-50">
                        <p className="text-zinc-800 font-medium">{d.title}</p>
                        <p className="text-[11px] text-zinc-400">{d.subtitle}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded px-2 py-1.5">
                <span className="text-xs text-zinc-800">{dealName}</span>
                <button type="button" onClick={() => { setDealId(""); setDealName(""); }} className="text-[11px] text-zinc-400 hover:text-zinc-600">Change</button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-1.5">
              <select value={outcome} onChange={(e) => setOutcome(e.target.value as "won" | "lost" | "no_decision")} className="px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400">
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="no_decision">No decision</option>
              </select>
              <input type="text" placeholder="Won by..." value={winningCompetitor} onChange={(e) => setWinningCompetitor(e.target.value)} className="px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
              <input type="number" placeholder="$ value" value={value} onChange={(e) => setValue(e.target.value)} className="px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
            </div>
            <input type="text" placeholder="Primary reason (one line)" value={primaryReason} onChange={(e) => setPrimaryReason(e.target.value)} className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
            <textarea placeholder="What worked" value={whatWorked} onChange={(e) => setWhatWorked(e.target.value)} rows={2} className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
            <textarea placeholder="What didn't" value={whatDidnt} onChange={(e) => setWhatDidnt(e.target.value)} rows={2} className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
            <textarea placeholder="Lessons / pattern" value={lessons} onChange={(e) => setLessons(e.target.value)} rows={2} className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
            <button type="button" onClick={submit} disabled={create.isPending || !dealId} className="w-full py-2 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50">
              {create.isPending ? "Saving..." : "Save record"}
            </button>
          </div>
        )}

        {isLoading ? (
          <p className="text-xs text-zinc-400 text-center py-8">Loading...</p>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm py-12 text-center">
            <Trophy size={20} className="inline text-zinc-300 mb-2" />
            <p className="text-xs text-zinc-400">
              No win/loss records yet. Capture the post-mortem on every closed deal — the pattern is the asset.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="bg-white rounded-lg border border-zinc-200 shadow-sm p-3 group relative">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                    r.outcome === "won" ? "bg-emerald-50 text-emerald-700"
                    : r.outcome === "lost" ? "bg-red-50 text-red-600"
                    : "bg-zinc-100 text-zinc-500"
                  }`}>
                    {r.outcome.replace("_", " ")}
                  </span>
                  {r.deal_id ? (
                    <Link href={`/deals/${r.deal_id}`} className="text-sm font-medium text-zinc-800 hover:underline">{r.deal_name || r.deal_id}</Link>
                  ) : (
                    <span className="text-sm text-zinc-500">(deleted deal)</span>
                  )}
                  <span className="text-xs text-zinc-700 tabular-nums ml-auto sm:ml-2">{fmt$(r.value_usd)}</span>
                  {r.winning_competitor && (
                    <span className="text-[11px] text-zinc-500">to {r.winning_competitor}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => destroy.ask({
                      title: "Delete this record?",
                      run: () => remove.mutateAsync({ entity: "win-loss", id: r.id }),
                    })}
                    className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 px-1"
                  >
                    ×
                  </button>
                </div>
                {r.primary_reason && (
                  <p className="text-xs text-zinc-700 mb-1.5"><span className="font-medium">Why:</span> {r.primary_reason}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  {r.what_worked && (
                    <div>
                      <span className="text-emerald-700 font-medium uppercase tracking-wide">What worked</span>
                      <p className="text-zinc-700 mt-0.5">{r.what_worked}</p>
                    </div>
                  )}
                  {r.what_didnt && (
                    <div>
                      <span className="text-red-700 font-medium uppercase tracking-wide">What didn&apos;t</span>
                      <p className="text-zinc-700 mt-0.5">{r.what_didnt}</p>
                    </div>
                  )}
                  {r.lessons && (
                    <div>
                      <span className="text-blue-700 font-medium uppercase tracking-wide">Lessons</span>
                      <p className="text-zinc-700 mt-0.5">{r.lessons}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {destroy.element}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "red" }) {
  const tc = tone === "emerald" ? "text-emerald-700" : tone === "red" ? "text-red-600" : "text-zinc-900";
  return (
    <div className="bg-white border border-zinc-200 rounded p-2.5">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${tc} mt-0.5`}>{value}</p>
    </div>
  );
}
