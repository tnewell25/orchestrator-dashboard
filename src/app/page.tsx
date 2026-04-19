"use client";

import { useState } from "react";
import Link from "next/link";
import { usePipeline, useAnalytics, usePatchDeal, useCreateDeal } from "@/lib/api";
import type { PipelineDeal } from "@/lib/api";
import { StatCard } from "@/components/stat-card";
import { Calendar, ArrowRight, Loader2, Plus } from "lucide-react";

const STAGE_ORDER = ["prospect", "qualified", "proposal", "negotiation"];
const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect", qualified: "Qualified", proposal: "Proposal", negotiation: "Negotiation",
};

const DRAG_MIME = "application/x-deal-id";

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
  const [dragging, setDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, deal.id);
        e.dataTransfer.setData("text/plain", deal.stage);
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={dragging ? "opacity-40" : ""}
    >
      <Link href={`/deals/${deal.id}`} draggable={false}>
        <div className="bg-white border border-slate-200 rounded p-2.5 hover:border-slate-300 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing group">
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
              <ArrowRight size={10} className="text-slate-400 shrink-0" />
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
    </div>
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
  const [dropActive, setDropActive] = useState(false);
  const patch = usePatchDeal();

  return (
    <div
      className="flex flex-col min-w-[220px] flex-1"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDropActive(true);
        }
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDropActive(false);
        const dealId = e.dataTransfer.getData(DRAG_MIME);
        const fromStage = e.dataTransfer.getData("text/plain");
        if (!dealId || fromStage === stage) return;
        patch.mutate({ id: dealId, stage });
      }}
    >
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
      <div
        className={`flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1 pb-2 rounded transition-colors ${
          dropActive ? "bg-blue-50/60 outline outline-2 outline-blue-200" : ""
        }`}
      >
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
        {deals.length === 0 && (
          <div className="text-[11px] text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded">
            Drop here
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
    <div className="p-3 sm:p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 relative">
        <h1 className="text-sm font-semibold text-slate-800">Pipeline</h1>
        <NewDealButton />
      </div>
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

function NewDealButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [stage, setStage] = useState("prospect");
  const [value, setValue] = useState("");
  const [nextStep, setNextStep] = useState("");
  const create = useCreateDeal();

  const submit = async () => {
    if (!name.trim()) return;
    await create.mutateAsync({
      name: name.trim(),
      stage,
      value_usd: Number(value) || 0,
      next_step: nextStep.trim(),
    });
    setName(""); setValue(""); setNextStep(""); setStage("prospect");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:border-slate-300 transition-colors"
      >
        <Plus size={12} />
        New deal
      </button>
    );
  }

  return (
    <div className="absolute right-4 top-12 z-10 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-72">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-700">New deal</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </div>
      <input
        type="text"
        autoFocus
        placeholder="Deal name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full mb-1.5 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-slate-400"
      />
      <div className="flex gap-1.5 mb-1.5">
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-slate-400"
        >
          {STAGE_ORDER.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="$ value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-24 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-slate-400"
        />
      </div>
      <input
        type="text"
        placeholder="Next step (optional)"
        value={nextStep}
        onChange={(e) => setNextStep(e.target.value)}
        className="w-full mb-2 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-slate-400"
      />
      <button
        type="button"
        onClick={submit}
        disabled={create.isPending || !name.trim()}
        className="w-full py-1 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {create.isPending ? "Creating..." : "Create deal"}
      </button>
    </div>
  );
}
