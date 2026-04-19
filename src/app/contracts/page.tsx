"use client";

import { useState } from "react";
import Link from "next/link";
import { Wrench, Plus } from "lucide-react";
import {
  useContracts,
  useCreateContract,
  useCompanies,
  usePlants,
  CONTRACT_TYPES,
  CONTRACT_STATUSES,
} from "@/lib/api";

const TYPE_LABELS: Record<string, string> = {
  pm_quarterly: "PM (quarterly)",
  pm_annual: "PM (annual)",
  "24x7_support": "24x7 support",
  on_call: "On-call",
  parts_only: "Parts only",
  training: "Training",
  calibration: "Calibration",
  other: "Other",
};

const STATUS_BADGES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  expiring: "bg-amber-50 text-amber-700",
  expired: "bg-red-50 text-red-700",
  cancelled: "bg-zinc-100 text-zinc-500",
  renewed: "bg-violet-50 text-violet-700",
};

function fmt$(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v.toLocaleString()}`;
}

function renewalUrgency(date: string | null): { text: string; cls: string } {
  if (!date) return { text: "—", cls: "text-zinc-400" };
  const days = Math.floor((new Date(date).getTime() - Date.now()) / 86_400_000);
  const dateStr = new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (days < 0) return { text: `${dateStr} (overdue)`, cls: "text-red-600 font-semibold" };
  if (days <= 30) return { text: `${dateStr} (${days}d)`, cls: "text-red-600 font-semibold" };
  if (days <= 90) return { text: `${dateStr} (${days}d)`, cls: "text-amber-600" };
  return { text: dateStr, cls: "text-zinc-500" };
}

export default function ContractsPage() {
  const [status, setStatus] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [plantId, setPlantId] = useState("");
  const [contractType, setContractType] = useState("pm_annual");
  const [value, setValue] = useState("");
  const [renewal, setRenewal] = useState("");

  const { data, isLoading } = useContracts({ status: status || undefined });
  const { data: companies } = useCompanies();
  const { data: plants } = usePlants({ company_id: companyId || undefined });
  const create = useCreateContract();
  const contracts = data ?? [];

  const totalAnnual = contracts.reduce((s, c) => s + (c.value_usd_annual || 0), 0);

  const submit = async () => {
    if (!name.trim() || !companyId) return;
    await create.mutateAsync({
      company_id: companyId, name: name.trim(),
      plant_id: plantId || null,
      contract_type: contractType,
      value_usd_annual: Number(value) || 0,
      renewal_date: renewal || null,
    });
    setName(""); setCompanyId(""); setPlantId(""); setContractType("pm_annual");
    setValue(""); setRenewal("");
    setAdding(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-sm font-semibold text-zinc-800">Service contracts</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Post-install recurring revenue. Renewal date drives priority — never miss a renewal.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-500 tabular-nums">
              {fmt$(totalAnnual)} ARR · {contracts.length} contracts
            </span>
            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800"
              >
                <Plus size={12} />
                New contract
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 bg-white border border-zinc-200 rounded-lg p-0.5 mb-3 w-fit">
          <button
            type="button"
            onClick={() => setStatus("")}
            className={`px-2.5 py-1 rounded text-[11px] font-medium ${status === "" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"}`}
          >
            All
          </button>
          {CONTRACT_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize ${status === s ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {adding && (
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-3 mb-3 space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-zinc-700">New contract</span>
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
              placeholder="Contract name (e.g. Site A PM 2026)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={companyId}
                onChange={(e) => { setCompanyId(e.target.value); setPlantId(""); }}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              >
                <option value="">Select company *</option>
                {(companies ?? []).map((co) => (
                  <option key={co.id} value={co.id}>{co.name}</option>
                ))}
              </select>
              <select
                value={plantId}
                onChange={(e) => setPlantId(e.target.value)}
                disabled={!companyId}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 disabled:opacity-50"
              >
                <option value="">No specific plant</option>
                {(plants ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              >
                {CONTRACT_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="$ annual"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              />
              <input
                type="date"
                value={renewal}
                onChange={(e) => setRenewal(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              />
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending || !name.trim() || !companyId}
              className="w-full py-1 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50"
            >
              {create.isPending ? "Creating..." : "Create contract"}
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_120px_140px_100px_100px] gap-3 px-4 py-2 border-b border-zinc-200 text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
            <div>Contract</div>
            <div>Company</div>
            <div>Type</div>
            <div>Renewal</div>
            <div className="text-right">Annual</div>
            <div className="text-right">Status</div>
          </div>
          {isLoading ? (
            <div className="py-8 text-center text-xs text-zinc-400">Loading...</div>
          ) : contracts.length === 0 ? (
            <div className="py-8 text-center">
              <Wrench size={20} className="inline text-zinc-300 mb-2" />
              <p className="text-xs text-zinc-400">No contracts in this view.</p>
            </div>
          ) : (
            contracts.map((c) => {
              const ren = renewalUrgency(c.renewal_date);
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-[1fr_140px_120px_140px_100px_100px] gap-3 px-4 py-2 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 text-xs items-center"
                >
                  <div className="min-w-0">
                    <p className="text-zinc-800 font-medium truncate">{c.name}</p>
                    {c.plant && (
                      <p className="text-[11px] text-zinc-400 truncate">↳ {c.plant}</p>
                    )}
                  </div>
                  {c.company_id ? (
                    <Link href={`/companies/${c.company_id}`} className="text-zinc-600 truncate hover:text-zinc-900">
                      {c.company || "—"}
                    </Link>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                  <span className="text-[11px] text-zinc-500">{TYPE_LABELS[c.contract_type] ?? c.contract_type}</span>
                  <span className={`text-[11px] tabular-nums ${ren.cls}`}>{ren.text}</span>
                  <span className="text-zinc-700 tabular-nums text-right">
                    {fmt$(c.value_usd_annual)}
                  </span>
                  <span className={`text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded text-right justify-self-end ${STATUS_BADGES[c.status] ?? "bg-zinc-100 text-zinc-500"}`}>
                    {c.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
