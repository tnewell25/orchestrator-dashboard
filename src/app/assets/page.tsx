"use client";

import { useState } from "react";
import Link from "next/link";
import { Cpu, Plus } from "lucide-react";
import {
  useAssets,
  useCreateAsset,
  usePlants,
  ASSET_TYPES,
  ASSET_VENDORS,
} from "@/lib/api";

const TYPE_LABELS: Record<string, string> = {
  dcs: "DCS", plc: "PLC", hmi: "HMI", scada: "SCADA",
  safety_system: "Safety system", drive: "Drive", motor: "Motor",
  instrument: "Instrument", network: "Network", analyzer: "Analyzer",
  other: "Other",
};

const VENDOR_BADGES: Record<string, string> = {
  us: "bg-emerald-50 text-emerald-700",
  competitor: "bg-red-50 text-red-700",
  partner: "bg-violet-50 text-violet-700",
};

function eolUrgency(date: string | null): { text: string; cls: string } {
  if (!date) return { text: "—", cls: "text-zinc-400" };
  const days = Math.floor((new Date(date).getTime() - Date.now()) / 86_400_000);
  const dateStr = new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  if (days < 0) return { text: `${dateStr} (past)`, cls: "text-red-600 font-semibold" };
  if (days < 365) return { text: `${dateStr} (<1y)`, cls: "text-red-600 font-semibold" };
  if (days < 730) return { text: `${dateStr} (<2y)`, cls: "text-amber-600" };
  return { text: dateStr, cls: "text-zinc-500" };
}

export default function AssetsPage() {
  const [vendor, setVendor] = useState<string>("");
  const [manufacturer, setManufacturer] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [plantId, setPlantId] = useState("");
  const [mfg, setMfg] = useState("");
  const [model, setModel] = useState("");
  const [assetType, setAssetType] = useState("dcs");
  const [createVendor, setCreateVendor] = useState("competitor");
  const [eol, setEol] = useState("");

  const { data, isLoading } = useAssets({ vendor: vendor || undefined, manufacturer: manufacturer || undefined });
  const { data: plants } = usePlants();
  const create = useCreateAsset();
  const assets = data ?? [];

  const submit = async () => {
    if (!name.trim() || !plantId) return;
    await create.mutateAsync({
      plant_id: plantId, name: name.trim(),
      manufacturer: mfg.trim(), model: model.trim(),
      asset_type: assetType, vendor: createVendor,
      end_of_life_date: eol || undefined,
    });
    setName(""); setPlantId(""); setMfg(""); setModel("");
    setAssetType("dcs"); setCreateVendor("competitor"); setEol("");
    setAdding(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-sm font-semibold text-zinc-800">Assets / installed base</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              What&apos;s already at each plant. Drives upsell, replacement planning, and warranty strategy.
            </p>
          </div>
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800"
            >
              <Plus size={12} />
              New asset
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-0.5 bg-white border border-zinc-200 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setVendor("")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium ${vendor === "" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              All vendors
            </button>
            {ASSET_VENDORS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVendor(v)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize ${vendor === v ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"}`}
              >
                {v}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Filter by manufacturer..."
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            className="flex-1 max-w-xs px-2 py-1 text-xs border border-zinc-200 rounded bg-white focus:outline-none focus:border-zinc-400"
          />
        </div>

        {adding && (
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-3 mb-3 space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-zinc-700">New asset</span>
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
              placeholder="Asset name (e.g. Process unit DCS)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={plantId}
                onChange={(e) => setPlantId(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              >
                <option value="">Select plant *</option>
                {(plants ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.company ? `(${p.company})` : ""}</option>
                ))}
              </select>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                placeholder="Manufacturer (Honeywell, ABB, ...)"
                value={mfg}
                onChange={(e) => setMfg(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              />
              <input
                type="text"
                placeholder="Model (Experion PKS, ...)"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={createVendor}
                onChange={(e) => setCreateVendor(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 capitalize"
              >
                {ASSET_VENDORS.map((v) => (
                  <option key={v} value={v}>{v} (vendor)</option>
                ))}
              </select>
              <input
                type="date"
                placeholder="End of life"
                value={eol}
                onChange={(e) => setEol(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              />
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending || !name.trim() || !plantId}
              className="w-full py-1 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50"
            >
              {create.isPending ? "Creating..." : "Create asset"}
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_120px_90px_140px_60px] gap-3 px-4 py-2 border-b border-zinc-200 text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
            <div>Asset</div>
            <div>Plant</div>
            <div>Mfg / Model</div>
            <div>Type</div>
            <div>EoL</div>
            <div className="text-right">Vendor</div>
          </div>
          {isLoading ? (
            <div className="py-8 text-center text-xs text-zinc-400">Loading...</div>
          ) : assets.length === 0 ? (
            <div className="py-8 text-center">
              <Cpu size={20} className="inline text-zinc-300 mb-2" />
              <p className="text-xs text-zinc-400">No assets in this view.</p>
            </div>
          ) : (
            assets.map((a) => {
              const eolInfo = eolUrgency(a.end_of_life_date);
              return (
                <div
                  key={a.id}
                  className="grid grid-cols-[1fr_140px_120px_90px_140px_60px] gap-3 px-4 py-2 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 text-xs items-center"
                >
                  <div className="min-w-0">
                    <p className="text-zinc-800 font-medium truncate">{a.name}</p>
                    {a.quantity > 1 && (
                      <p className="text-[11px] text-zinc-400">×{a.quantity}</p>
                    )}
                  </div>
                  <Link
                    href={`/plants/${a.plant_id}`}
                    className="text-zinc-600 truncate hover:text-zinc-900"
                  >
                    {a.plant}
                  </Link>
                  <div className="min-w-0">
                    <p className="text-zinc-700 truncate">{a.manufacturer}</p>
                    {a.model && <p className="text-[11px] text-zinc-400 truncate">{a.model}</p>}
                  </div>
                  <span className="text-[11px] text-zinc-500">{TYPE_LABELS[a.asset_type] ?? a.asset_type}</span>
                  <span className={`text-[11px] tabular-nums ${eolInfo.cls}`}>{eolInfo.text}</span>
                  <span className={`text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded text-right justify-self-end ${VENDOR_BADGES[a.vendor] ?? "bg-zinc-100 text-zinc-500"}`}>
                    {a.vendor}
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
