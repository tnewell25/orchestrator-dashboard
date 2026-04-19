"use client";

import Link from "next/link";
import { TrendingUp, Loader2 } from "lucide-react";
import { useForecast, type ForecastDealRow } from "@/lib/api";

const BUCKETS: { key: "commit" | "best_case" | "pipeline"; label: string; color: string; bg: string }[] = [
  { key: "commit", label: "Commit", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  { key: "best_case", label: "Best Case", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  { key: "pipeline", label: "Pipeline", color: "text-zinc-700", bg: "bg-zinc-50 border-zinc-200" },
];

function fmt$(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v.toLocaleString()}`;
}

function meddicColor(p: number) {
  if (p >= 70) return "text-emerald-600";
  if (p >= 40) return "text-amber-600";
  return "text-red-600";
}

function championColor(s: number) {
  if (s >= 70) return "text-emerald-600";
  if (s >= 40) return "text-amber-600";
  return "text-red-600";
}

function slipColor(r: number) {
  if (r >= 70) return "text-red-600";
  if (r >= 40) return "text-amber-600";
  return "text-emerald-600";
}

function DealRow({ d }: { d: ForecastDealRow }) {
  return (
    <Link
      href={`/deals/${d.id}`}
      className="block px-3 py-2 border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80 transition-colors"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-zinc-800 truncate">{d.name}</span>
        <span className="text-xs font-semibold text-zinc-900 tabular-nums shrink-0">
          {fmt$(d.value_usd)}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-zinc-500 mb-1">
        <span>{d.stage}</span>
        <span className={meddicColor(d.meddic_pct)} title="MEDDIC fill %">
          MEDDIC {d.meddic_pct}%
        </span>
        <span className={championColor(d.champion_score)} title={d.champion_detail}>
          Champ {d.champion_score}
        </span>
        <span className={slipColor(d.slip_risk)} title="Probability the deal slips this quarter">
          Slip {d.slip_risk}%
        </span>
      </div>
      {d.reasons.length > 0 && (
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          {d.reasons.join(" · ")}
        </p>
      )}
    </Link>
  );
}

export default function ForecastPage() {
  const { data, isLoading } = useForecast();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-zinc-400" />
      </div>
    );
  }

  const buckets = data?.buckets ?? { commit: [], best_case: [], pipeline: [] };
  const totals = data?.totals ?? {};

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-sm font-semibold text-zinc-800">Forecast</h1>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Bucketing is deterministic — stage × MEDDIC fill × champion strength.
            Click any deal to see its full health scorecard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BUCKETS.map((b) => {
            const items = buckets[b.key] ?? [];
            const total = totals[b.key] ?? { count: 0, value: 0 };
            return (
              <div key={b.key} className={`rounded-lg border ${b.bg}`}>
                <div className="px-3 py-2 border-b border-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={12} className={b.color} />
                    <span className={`text-xs font-semibold ${b.color}`}>{b.label}</span>
                    <span className="text-[11px] text-zinc-500 tabular-nums">
                      ({total.count})
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-zinc-700 tabular-nums">
                    {fmt$(total.value)}
                  </span>
                </div>
                <div className="bg-white">
                  {items.length === 0 ? (
                    <p className="text-[11px] text-zinc-400 text-center py-6">No deals.</p>
                  ) : (
                    items.map((d) => <DealRow key={d.id} d={d} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-white border border-zinc-200 rounded-lg p-3 text-[11px] text-zinc-500 leading-relaxed">
          <p className="font-medium text-zinc-700 mb-1">How buckets are derived</p>
          <ul className="space-y-0.5 ml-4 list-disc">
            <li><span className="font-medium text-emerald-700">Commit</span> — negotiation, MEDDIC ≥ 70%, champion score ≥ 60</li>
            <li><span className="font-medium text-amber-700">Best Case</span> — proposal/negotiation, MEDDIC ≥ 50%, champion ≥ 40</li>
            <li><span className="font-medium text-zinc-700">Pipeline</span> — everything else</li>
          </ul>
          <p className="mt-2"><span className="font-medium text-zinc-700">Champion score</span> = sentiment × influence × recency-of-touch decay (today=100, 30d=70, 60d=40, 90d+=10)</p>
          <p className="mt-1"><span className="font-medium text-zinc-700">Slip risk</span> ≠ loss risk. Industrial deals slip a fiscal quarter routinely. Stage drives base; MEDDIC gaps and weak champion add risk.</p>
        </div>
      </div>
    </div>
  );
}
