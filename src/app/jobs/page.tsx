"use client";

import { useState } from "react";
import Link from "next/link";
import { HardHat, Plus } from "lucide-react";
import {
  useJobsList,
  useCreateJob,
  useCompanies,
  JOB_STAGES,
} from "@/lib/api";

const STAGE_BADGES: Record<string, string> = {
  scheduled: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-50 text-blue-700",
  punch: "bg-amber-50 text-amber-700",
  inspected: "bg-violet-50 text-violet-700",
  closed_out: "bg-emerald-50 text-emerald-700",
  warranty: "bg-zinc-100 text-zinc-500",
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

export default function JobsPage() {
  const [stage, setStage] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [jobStage, setJobStage] = useState("scheduled");
  const [value, setValue] = useState("");
  const [start, setStart] = useState("");

  const { data, isLoading } = useJobsList({ stage: stage || undefined });
  const { data: companies } = useCompanies();
  const create = useCreateJob();
  const jobs = data ?? [];

  const submit = async () => {
    if (!name.trim()) return;
    await create.mutateAsync({
      name: name.trim(), company_id: companyId || null,
      stage: jobStage, contract_value_usd: Number(value) || 0,
      scheduled_start: start || null,
    });
    setName(""); setCompanyId(""); setJobStage("scheduled");
    setValue(""); setStart("");
    setAdding(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-zinc-800">Jobs</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5 hidden sm:block">
              Won deals → execution. Daily logs, change orders, punchlist all live here.
            </p>
          </div>
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 shrink-0"
            >
              <Plus size={12} />
              New
            </button>
          )}
        </div>

        <div className="flex items-center gap-0.5 bg-white border border-zinc-200 rounded-lg p-0.5 mb-3 w-fit overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setStage("")}
            className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap ${stage === "" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"}`}
          >
            All
          </button>
          {JOB_STAGES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStage(s)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap capitalize ${stage === s ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        {adding && (
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-3 mb-3 space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-zinc-700">New job</span>
              <button type="button" onClick={() => setAdding(false)} className="text-[11px] text-zinc-400 hover:text-zinc-600">
                Cancel
              </button>
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Job name (e.g. Plant 7 Install)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              >
                <option value="">No company</option>
                {(companies ?? []).map((co) => (
                  <option key={co.id} value={co.id}>{co.name}</option>
                ))}
              </select>
              <select
                value={jobStage}
                onChange={(e) => setJobStage(e.target.value)}
                className="px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 capitalize"
              >
                {JOB_STAGES.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="number"
                placeholder="Contract value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              />
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              />
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending || !name.trim()}
              className="w-full py-2 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50"
            >
              {create.isPending ? "Creating..." : "Create job"}
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-zinc-400">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="py-8 text-center">
              <HardHat size={20} className="inline text-zinc-300 mb-2" />
              <p className="text-xs text-zinc-400">No jobs in this view.</p>
            </div>
          ) : (
            jobs.map((j) => (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${STAGE_BADGES[j.stage] ?? "bg-slate-100 text-slate-600"}`}>
                      {j.stage.replace("_", " ")}
                    </span>
                    <span className="text-xs font-medium text-zinc-800 truncate">{j.name}</span>
                    {j.job_number && (
                      <span className="text-[10px] text-zinc-400 font-mono">{j.job_number}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                    {j.company || "—"} {j.site_address && `· ${j.site_address}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-zinc-900 tabular-nums">
                    {fmt$(j.contract_value_usd)}
                  </p>
                  {j.scheduled_start && (
                    <p className="text-[11px] text-zinc-400 tabular-nums">
                      {fmtDate(j.scheduled_start)}
                    </p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
