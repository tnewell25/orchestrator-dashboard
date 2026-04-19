"use client";

import { useState } from "react";
import Link from "next/link";
import { Factory, Plus } from "lucide-react";
import {
  usePlants,
  useCompanies,
  useCreatePlant,
  PLANT_SITE_TYPES,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";

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

export default function PlantsPage() {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [siteType, setSiteType] = useState("manufacturing");
  const [siteAddress, setSiteAddress] = useState("");

  const { data, isLoading } = usePlants({ q: query || undefined });
  const { data: companies } = useCompanies();
  const create = useCreatePlant();
  const plants = data ?? [];

  const submit = async () => {
    if (!name.trim() || !companyId) return;
    await create.mutateAsync({
      name: name.trim(),
      company_id: companyId,
      site_type: siteType,
      site_address: siteAddress.trim(),
    });
    setName(""); setCompanyId(""); setSiteType("manufacturing"); setSiteAddress("");
    setAdding(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <PageHeader
          title="Plants"
          description="Sites belonging to your accounts. A deal at Bosch Stuttgart is not the same as Bosch Mexico."
          meta={
            <span className="text-[11px] text-zinc-400 tabular-nums">
              {plants.length} {plants.length === 1 ? "plant" : "plants"}
            </span>
          }
          actions={
            !adding && (
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus size={12} /> New
              </Button>
            )
          }
        />

        {adding && (
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-3 mb-3 space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-zinc-700">New plant</span>
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
              placeholder="Plant name (e.g. Stuttgart Forge)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              >
                <option value="">Select company *</option>
                {(companies ?? []).map((co) => (
                  <option key={co.id} value={co.id}>{co.name}</option>
                ))}
              </select>
              <select
                value={siteType}
                onChange={(e) => setSiteType(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              >
                {PLANT_SITE_TYPES.map((t) => (
                  <option key={t} value={t}>{SITE_TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              placeholder="Site address (city, country)"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
            />
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending || !name.trim() || !companyId}
              className="w-full py-1 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50"
            >
              {create.isPending ? "Creating..." : "Create plant"}
            </button>
          </div>
        )}

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plants..."
          className="w-full mb-3 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300"
        />

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-3"><SkeletonList rows={5} height={48} /></div>
          ) : plants.length === 0 ? (
            <EmptyState
              icon={Factory}
              title={query ? "No plants match" : "No plants yet"}
              description={query ? "Try a different search." : "Add a plant to attach deals to specific sites — most companies have many."}
              action={!query && !adding && (
                <Button size="sm" onClick={() => setAdding(true)}>
                  <Plus size={12} /> Add first plant
                </Button>
              )}
            />
          ) : (
            plants.map((p) => (
              <Link
                key={p.id}
                href={`/plants/${p.id}`}
                className="grid grid-cols-[1fr_140px_140px_120px] gap-3 px-4 py-2.5 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors text-xs items-center"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 bg-zinc-100 rounded flex items-center justify-center shrink-0">
                    <Factory size={13} className="text-zinc-500" strokeWidth={1.8} />
                  </div>
                  <span className="text-zinc-800 font-medium truncate">{p.name}</span>
                </div>
                <span className="text-zinc-600 truncate">{p.company || "—"}</span>
                <span className="text-zinc-500 truncate">{p.site_address}</span>
                <span className="text-[11px] text-zinc-500">{SITE_TYPE_LABELS[p.site_type] ?? p.site_type}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
