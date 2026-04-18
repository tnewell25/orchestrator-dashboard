"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  usePlantDetail,
  usePatchPlant,
  useDeleteEntity,
  PLANT_SITE_TYPES,
} from "@/lib/api";
import { useConfirmDestroy } from "@/components/confirm-destroy";

const SITE_TYPE_LABELS: Record<string, string> = {
  refinery: "Refinery",
  chemical: "Chemical",
  power_gen: "Power gen",
  water_wastewater: "Water/wastewater",
  manufacturing: "Manufacturing",
  data_center: "Data center",
  pharma: "Pharma",
  food_bev: "Food & bev",
  mining: "Mining",
  utility_substation: "Utility substation",
  other: "Other",
};

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

function fmt$(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v.toLocaleString()}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
        rows={3}
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

export default function PlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = usePlantDetail(id);
  const patch = usePatchPlant();
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
        <p className="text-xs text-zinc-500">Plant not found.</p>
      </div>
    );
  }

  const { plant, deals, bids } = data;
  const onPatch = (p: Record<string, unknown>) => patch.mutate({ id, ...p });

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link
          href="/plants"
          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 mb-4"
        >
          ← Plants
        </Link>

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-5 mb-4">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200">
            <div className="min-w-0 flex-1">
              <EditableText
                value={plant.name}
                onSave={(name) => onPatch({ name })}
                className="text-base font-semibold text-zinc-900"
              />
              {plant.company && (
                <p className="mt-0.5 text-xs">
                  <Link href={`/companies/${plant.company.id}`} className="text-zinc-500 hover:text-zinc-700">
                    {plant.company.name}
                  </Link>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={plant.site_type}
                onChange={(e) => onPatch({ site_type: e.target.value })}
                className="px-2 py-0.5 rounded text-[11px] font-medium border border-zinc-200 bg-white cursor-pointer"
              >
                {PLANT_SITE_TYPES.map((t) => (
                  <option key={t} value={t}>{SITE_TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  destroy.ask({
                    title: `Delete ${plant.name}?`,
                    body: "Removes this plant. Deals and bids attached to it stay (their plant link is cleared).",
                    typeToConfirm: plant.name,
                    run: async () => {
                      await remove.mutateAsync({ entity: "plants", id });
                      router.push("/plants");
                    },
                  })
                }
                className="px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 rounded"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 text-xs">
            <div>
              <span className="text-[11px] text-zinc-400 uppercase tracking-wide block mb-0.5">Site address</span>
              <EditableText
                value={plant.site_address}
                placeholder="City, country"
                onSave={(site_address) => onPatch({ site_address })}
              />
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 uppercase tracking-wide block mb-0.5">Plant manager</span>
              {plant.plant_manager ? (
                <span className="text-zinc-700">
                  {plant.plant_manager.name} · {plant.plant_manager.title}
                </span>
              ) : (
                <span className="text-zinc-400 italic">Not assigned</span>
              )}
            </div>
            <div className="sm:col-span-2">
              <span className="text-[11px] text-zinc-400 uppercase tracking-wide block mb-0.5">
                Standards / parent-co context
              </span>
              <EditableText
                value={plant.standards_notes}
                placeholder="Parent-co standards committee, approved-vendor list, special compliance regime..."
                onSave={(standards_notes) => onPatch({ standards_notes })}
                multiline
                className="block"
              />
            </div>
            <div className="sm:col-span-2">
              <span className="text-[11px] text-zinc-400 uppercase tracking-wide block mb-0.5">Notes</span>
              <EditableText
                value={plant.notes}
                placeholder="Site-specific intel"
                onSave={(notes) => onPatch({ notes })}
                multiline
                className="block"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-3">
            <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-2 px-1">
              Deals ({deals.length})
            </h2>
            {deals.length === 0 ? (
              <p className="text-xs text-zinc-400 py-2 px-1">No deals at this plant yet.</p>
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
                  <span className="text-zinc-500 tabular-nums shrink-0">{fmt$(d.value_usd)}</span>
                </Link>
              ))
            )}
          </div>

          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-3">
            <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-2 px-1">
              Bids ({bids.length})
            </h2>
            {bids.length === 0 ? (
              <p className="text-xs text-zinc-400 py-2 px-1">No bids tracked.</p>
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
                    {b.submission_deadline ? fmtDate(b.submission_deadline) : fmt$(b.value_usd)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
      {destroy.element}
    </div>
  );
}
