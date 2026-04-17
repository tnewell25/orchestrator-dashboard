"use client";

import Link from "next/link";
import { usePipeline, useAnalytics } from "@/lib/api";
import type { PipelineDeal } from "@/lib/api";
import { StatCard } from "@/components/stat-card";
import { Calendar, ArrowRight, Loader2 } from "lucide-react";

const STAGE_ORDER = ["prospect", "qualified", "proposal", "negotiation"];
const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect", qualified: "Qualified", proposal: "Proposal", negotiation: "Negotiation",
};

const STAGE_COLORS: Record<string, string> = {
  prospect: "bg-slate-400",
  qualified: "bg-blue-500",
  proposal: "bg-violet-500",
  negotiation: "bg-amber-500",
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }
  return `$${value.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DealCard({ deal }: { deal: PipelineDeal }) {
  return (
    <Link href={`/deals/${deal.id}`}>
      <div className="bg-white border border-slate-200 rounded p-2.5 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group">
        <div className="flex items-start justify-between gap-1.5 mb-1">
          <p className="text-xs font-medium text-slate-900 leading-tight truncate">
            {deal.name}
          </p>
          <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
            {formatCurrency(deal.value_usd)}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 truncate">{deal.company}</p>
        {deal.next_step && (
          <div className="flex items-center gap-1 mt-1.5">
            <ArrowRight
              size={10}
              className="text-slate-400 shrink-0"
            />
            <p className="text-[11px] text-slate-400 truncate">
              {deal.next_step}
            </p>
          </div>
        )}
        {deal.close_date && (
          <div className="flex items-center gap-1 mt-1">
            <Calendar size={10} className="text-slate-400 shrink-0" />
            <p className="text-[11px] text-slate-400">
              {formatDate(deal.close_date)}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

function StageColumn({
  stage,
  deals,
}: {
  stage: string;
  deals: PipelineDeal[];
}) {
  const totalValue = deals.reduce((sum, d) => sum + (d.value_usd || 0), 0);
  const color = STAGE_COLORS[stage] || "bg-slate-400";

  return (
    <div className="flex flex-col min-w-[220px] flex-1">
      <div className="flex items-center gap-2 px-1 mb-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <h3 className="text-xs font-semibold text-slate-700">{STAGE_LABELS[stage] || stage}</h3>
        <span className="text-[11px] text-slate-400 font-medium">
          {deals.length}
        </span>
        <span className="text-[11px] text-slate-400 ml-auto">
          {formatCurrency(totalValue)}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1 pb-2">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
        {deals.length === 0 && (
          <div className="text-[11px] text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded">
            No deals
          </div>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const pipeline = usePipeline();
  const analytics = useAnalytics();

  const isLoading = pipeline.isLoading || analytics.isLoading;
  const hasError = pipeline.isError || analytics.isError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-slate-500">Failed to load pipeline data</p>
          <button
            onClick={() => {
              pipeline.refetch();
              analytics.refetch();
            }}
            className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stages = pipeline.data?.stages || {};
  const stats = analytics.data;

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="grid grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Active Deals"
          value={String(stats?.active_deals ?? 0)}
        />
        <StatCard
          label="Pipeline Value"
          value={formatCurrency(stats?.active_pipeline_value ?? 0)}
        />
        <StatCard
          label="Win Rate"
          value={`${Math.round(stats?.win_rate ?? 0)}%`}
        />
        <StatCard
          label="Open Actions"
          value={String(stats?.open_actions ?? 0)}
        />
      </div>

      <div className="flex gap-3 flex-1 min-h-0 overflow-x-auto">
        {STAGE_ORDER.map((stage) => (
          <StageColumn
            key={stage}
            stage={stage}
            deals={stages[stage] || []}
          />
        ))}
      </div>
    </div>
  );
}
