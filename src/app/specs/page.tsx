"use client";

import { useState } from "react";
import { ShieldCheck, Plus } from "lucide-react";
import {
  useSpecs,
  useCreateSpec,
  useDeleteSpec,
  SPEC_FAMILIES,
} from "@/lib/api";
import { useConfirmDestroy } from "@/components/confirm-destroy";

const FAMILY_LABELS: Record<string, string> = {
  hazardous_area: "Hazardous area",
  functional_safety: "Functional safety",
  cybersecurity: "Cybersecurity (OT/IT)",
  electrical: "Electrical",
  export_control: "Export control",
  quality: "Quality",
  environmental: "Environmental",
  other: "Other",
};

const FAMILY_COLOR: Record<string, string> = {
  hazardous_area: "bg-orange-50 text-orange-700",
  functional_safety: "bg-red-50 text-red-700",
  cybersecurity: "bg-violet-50 text-violet-700",
  electrical: "bg-blue-50 text-blue-700",
  export_control: "bg-amber-50 text-amber-700",
  quality: "bg-emerald-50 text-emerald-700",
  environmental: "bg-teal-50 text-teal-700",
  other: "bg-slate-100 text-slate-600",
};

export default function SpecsPage() {
  const [family, setFamily] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [createFamily, setCreateFamily] = useState("hazardous_area");
  const [scope, setScope] = useState("");

  const { data, isLoading } = useSpecs(family || undefined);
  const create = useCreateSpec();
  const remove = useDeleteSpec();
  const destroy = useConfirmDestroy();
  const specs = data ?? [];

  const submit = async () => {
    if (!code.trim() || !name.trim()) return;
    try {
      await create.mutateAsync({
        code: code.trim(), name: name.trim(),
        family: createFamily, scope: scope.trim(),
      });
      setCode(""); setName(""); setScope(""); setCreateFamily("hazardous_area");
      setAdding(false);
    } catch (e) {
      // Duplicate code returns 409 from backend
      alert((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-sm font-semibold text-zinc-800">Specs &amp; certifications</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Reusable standards library — referenced by compliance-matrix rows on bids.
            </p>
          </div>
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800"
            >
              <Plus size={12} />
              New spec
            </button>
          )}
        </div>

        <div className="flex items-center gap-0.5 bg-white border border-zinc-200 rounded-lg p-0.5 mb-3 w-fit overflow-x-auto">
          <button
            type="button"
            onClick={() => setFamily("")}
            className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap ${
              family === "" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            All
          </button>
          {SPEC_FAMILIES.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFamily(f)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap ${
                family === f ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {FAMILY_LABELS[f] ?? f}
            </button>
          ))}
        </div>

        {adding && (
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-3 mb-3 space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-zinc-700">New spec</span>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="text-[11px] text-zinc-400 hover:text-zinc-600"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                autoFocus
                type="text"
                placeholder="Code (e.g. ATEX-Zone1)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              />
              <select
                value={createFamily}
                onChange={(e) => setCreateFamily(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              >
                {SPEC_FAMILIES.map((f) => (
                  <option key={f} value={f}>{FAMILY_LABELS[f] ?? f}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              placeholder="Name (e.g. ATEX Zone 1 — gas, intermittent)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
            />
            <textarea
              placeholder="Scope — what this covers, what evidence we usually need to produce"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              rows={2}
              className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
            />
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending || !code.trim() || !name.trim()}
              className="w-full py-1 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50"
            >
              {create.isPending ? "Creating..." : "Create spec"}
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-8 text-center">
              <p className="text-xs text-zinc-400">Loading...</p>
            </div>
          ) : specs.length === 0 ? (
            <div className="py-8 text-center">
              <ShieldCheck size={20} className="inline text-zinc-300 mb-2" />
              <p className="text-xs text-zinc-400">
                No specs yet. Add your standards library to make compliance matrices reusable across bids.
              </p>
            </div>
          ) : (
            specs.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-[140px_1fr_140px_24px] gap-3 px-4 py-2 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 text-xs items-start group"
              >
                <span className="font-mono text-[11px] text-zinc-700 mt-0.5">{s.code}</span>
                <div>
                  <p className="text-zinc-800 font-medium">{s.name}</p>
                  {s.scope && <p className="text-[11px] text-zinc-500 mt-0.5">{s.scope}</p>}
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide w-fit ${FAMILY_COLOR[s.family] ?? FAMILY_COLOR.other}`}>
                  {FAMILY_LABELS[s.family] ?? s.family}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    destroy.ask({
                      title: `Delete ${s.code}?`,
                      body: "Removes from the library. Compliance items already referencing this spec will keep the orphan id.",
                      run: () => remove.mutateAsync(s.id),
                    })
                  }
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      {destroy.element}
    </div>
  );
}
