"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useJobDetail, usePatchJob, useDeleteEntity,
  useCreateDailyLog, useCreateChangeOrder, usePatchChangeOrder, useCreatePunch, usePatchPunch,
  JOB_STAGES, CO_STATUSES, PUNCH_STATUSES,
} from "@/lib/api";
import { useConfirmDestroy } from "@/components/confirm-destroy";

const STAGE_BADGES: Record<string, string> = {
  scheduled: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-50 text-blue-700",
  punch: "bg-amber-50 text-amber-700",
  inspected: "bg-violet-50 text-violet-700",
  closed_out: "bg-emerald-50 text-emerald-700",
  warranty: "bg-zinc-100 text-zinc-500",
};

const CO_BADGES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600",
  pm_review: "bg-blue-50 text-blue-700",
  submitted: "bg-violet-50 text-violet-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
  invoiced: "bg-amber-50 text-amber-700",
};

const PUNCH_BADGES: Record<string, string> = {
  open: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  done: "bg-emerald-50 text-emerald-700",
  waived: "bg-zinc-100 text-zinc-500",
};

function fmt$(v: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v); }
function fmtDate(d: string | null) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

type Tab = "overview" | "logs" | "changes" | "punch";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useJobDetail(id);
  const patch = usePatchJob();
  const remove = useDeleteEntity();
  const destroy = useConfirmDestroy();
  const [tab, setTab] = useState<Tab>("overview");

  if (isLoading) return <div className="min-h-screen bg-zinc-50 flex items-center justify-center"><p className="text-xs text-zinc-400">Loading...</p></div>;
  if (!data) return <div className="min-h-screen bg-zinc-50 flex items-center justify-center"><p className="text-xs text-zinc-500">Job not found.</p></div>;

  const { job, daily_logs, change_orders, punchlist } = data;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Link href="/jobs" className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 mb-3">
          ← Jobs
        </Link>

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4 sm:p-5 mb-4">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-200">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-semibold text-zinc-900 truncate">{job.name}</h1>
                <select
                  value={job.stage}
                  onChange={(e) => patch.mutate({ id, stage: e.target.value })}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border-0 cursor-pointer ${STAGE_BADGES[job.stage] ?? "bg-slate-100 text-slate-600"}`}
                >
                  {JOB_STAGES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                {job.company} {job.job_number && `· ${job.job_number}`} {job.site_address && `· ${job.site_address}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => destroy.ask({
                title: `Delete ${job.name}?`,
                body: "Cascades to all daily logs, change orders, and punchlist items.",
                typeToConfirm: job.name,
                run: async () => { await remove.mutateAsync({ entity: "jobs", id }); router.push("/jobs"); },
              })}
              className="px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 rounded shrink-0"
            >
              Delete
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b border-zinc-200 text-xs">
            <Stat label="Contract" value={fmt$(job.contract_value_usd)} />
            <Stat label="Labor budget" value={`${job.labor_budget_hours.toFixed(0)}h`} />
            <Stat label="Sched start" value={fmtDate(job.scheduled_start)} />
            <Stat label="Sched end" value={fmtDate(job.scheduled_end)} />
          </div>

          <div className="flex items-center gap-0.5 bg-zinc-100 rounded p-0.5 mt-3 w-fit overflow-x-auto max-w-full">
            <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>Overview</TabBtn>
            <TabBtn active={tab === "logs"} onClick={() => setTab("logs")}>
              Daily logs <span className="opacity-60 ml-1">{daily_logs.length}</span>
            </TabBtn>
            <TabBtn active={tab === "changes"} onClick={() => setTab("changes")}>
              Change orders <span className="opacity-60 ml-1">{change_orders.length}</span>
            </TabBtn>
            <TabBtn active={tab === "punch"} onClick={() => setTab("punch")}>
              Punchlist <span className="opacity-60 ml-1">{punchlist.filter((p) => p.status !== "done" && p.status !== "waived").length}</span>
            </TabBtn>
          </div>
        </div>

        {tab === "overview" && (
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4 space-y-3">
            <div>
              <span className="text-[11px] text-zinc-400 uppercase tracking-wide block mb-1">Scope</span>
              <p className="text-xs text-zinc-700 whitespace-pre-wrap">{job.scope || <span className="italic text-zinc-400">(none)</span>}</p>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 uppercase tracking-wide block mb-1">GC / Owner</span>
              <p className="text-xs text-zinc-700">{job.gc_name || <span className="italic text-zinc-400">(none)</span>}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-zinc-400 uppercase tracking-wide block mb-1">PM</span>
                <p className="text-xs text-zinc-700">{job.project_manager || <span className="italic text-zinc-400">unassigned</span>}</p>
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 uppercase tracking-wide block mb-1">Foreman</span>
                <p className="text-xs text-zinc-700">{job.foreman || <span className="italic text-zinc-400">unassigned</span>}</p>
              </div>
            </div>
            {job.deal && (
              <p className="text-[11px] text-zinc-500 border-t border-zinc-100 pt-2">
                From <Link href={`/deals/${job.deal_id}`} className="text-blue-600 hover:underline">{job.deal}</Link>
                {job.bid && <> via <Link href={`/bids/${job.bid_id}`} className="text-blue-600 hover:underline">{job.bid}</Link></>}
              </p>
            )}
            <div>
              <span className="text-[11px] text-zinc-400 uppercase tracking-wide block mb-1">Notes</span>
              <p className="text-xs text-zinc-700 whitespace-pre-wrap">{job.notes || <span className="italic text-zinc-400">(none)</span>}</p>
            </div>
          </div>
        )}

        {tab === "logs" && <LogsSection jobId={id} logs={daily_logs} />}
        {tab === "changes" && <ChangesSection jobId={id} changes={change_orders} />}
        {tab === "punch" && <PunchSection jobId={id} items={punchlist} />}
      </div>
      {destroy.element}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`px-3 py-1 rounded text-[11px] font-medium whitespace-nowrap ${active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-zinc-900 tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

function LogsSection({ jobId, logs }: { jobId: string; logs: { id: string; log_date: string; summary: string; work_performed: string; issues: string; hours_total: number; next_day_plan: string }[] }) {
  const create = useCreateDailyLog(jobId);
  const remove = useDeleteEntity();
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState("");
  const [summary, setSummary] = useState("");
  const [work, setWork] = useState("");
  const [issues, setIssues] = useState("");
  const [hours, setHours] = useState("");
  const [next, setNext] = useState("");

  const submit = async () => {
    if (!summary.trim() && !work.trim()) return;
    await create.mutateAsync({
      log_date: date || null, summary, work_performed: work,
      issues, hours_total: Number(hours) || 0, next_day_plan: next,
    });
    setDate(""); setSummary(""); setWork(""); setIssues(""); setHours(""); setNext("");
    setAdding(false);
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Daily logs</h2>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">
            + Log day
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-zinc-50 border border-zinc-200 rounded p-2 mb-3 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
            <input type="number" placeholder="Hours total" value={hours} onChange={(e) => setHours(e.target.value)} className="px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
          </div>
          <textarea autoFocus placeholder="Summary — what got done today" value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
          <textarea placeholder="Work performed (specific tasks)" value={work} onChange={(e) => setWork(e.target.value)} rows={2} className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
          <textarea placeholder="Issues / blockers" value={issues} onChange={(e) => setIssues(e.target.value)} rows={2} className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
          <textarea placeholder="Plan for tomorrow" value={next} onChange={(e) => setNext(e.target.value)} rows={2} className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
          <div className="flex gap-1.5">
            <button type="button" onClick={submit} disabled={create.isPending} className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50">
              Save log
            </button>
            <button type="button" onClick={() => setAdding(false)} className="px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <p className="text-xs text-zinc-400 py-4 text-center">No daily logs yet.</p>
      ) : (
        <div className="divide-y divide-zinc-100">
          {logs.map((l) => (
            <div key={l.id} className="py-2.5 group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <span className="tabular-nums font-medium text-zinc-700">{fmtDate(l.log_date)}</span>
                  {l.hours_total > 0 && <span>· {l.hours_total}h</span>}
                </div>
                <button type="button" onClick={() => remove.mutate({ entity: "daily-logs", id: l.id })} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 px-1">×</button>
              </div>
              {l.summary && <p className="text-xs text-zinc-700 leading-relaxed">{l.summary}</p>}
              {l.work_performed && <p className="text-[11px] text-zinc-500 mt-1"><span className="font-medium text-zinc-600">Work:</span> {l.work_performed}</p>}
              {l.issues && <p className="text-[11px] text-amber-700 mt-1"><span className="font-medium">Issues:</span> {l.issues}</p>}
              {l.next_day_plan && <p className="text-[11px] text-zinc-500 mt-1"><span className="font-medium text-zinc-600">Tomorrow:</span> {l.next_day_plan}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChangesSection({ jobId, changes }: { jobId: string; changes: { id: string; co_number: string; status: string; description: string; price_usd: number; labor_hours: number; approved_at: string | null; approver: string }[] }) {
  const create = useCreateChangeOrder(jobId);
  const patch = usePatchChangeOrder(jobId);
  const remove = useDeleteEntity();
  const [adding, setAdding] = useState(false);
  const [number, setNumber] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [hours, setHours] = useState("");

  const submit = async () => {
    if (!desc.trim()) return;
    await create.mutateAsync({ description: desc, co_number: number, price_usd: Number(price) || 0, labor_hours: Number(hours) || 0 });
    setNumber(""); setDesc(""); setPrice(""); setHours("");
    setAdding(false);
  };

  const totalApproved = changes.filter((c) => c.status === "approved" || c.status === "invoiced").reduce((s, c) => s + (c.price_usd || 0), 0);

  return (
    <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Change orders</h2>
          {totalApproved > 0 && (
            <p className="text-[11px] text-emerald-700 mt-0.5">{fmt$(totalApproved)} approved revenue</p>
          )}
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">
            + Capture CO
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-zinc-50 border border-zinc-200 rounded p-2 mb-3 space-y-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            <input type="text" placeholder="CO# (e.g. 001)" value={number} onChange={(e) => setNumber(e.target.value)} className="px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
            <input type="number" placeholder="Hours" value={hours} onChange={(e) => setHours(e.target.value)} className="px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
            <input type="number" placeholder="Price $" value={price} onChange={(e) => setPrice(e.target.value)} className="px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
          </div>
          <textarea autoFocus placeholder="What's the scope change?" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
          <div className="flex gap-1.5">
            <button type="button" onClick={submit} disabled={create.isPending || !desc.trim()} className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50">
              Save CO
            </button>
            <button type="button" onClick={() => setAdding(false)} className="px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {changes.length === 0 ? (
        <p className="text-xs text-zinc-400 py-4 text-center">No change orders yet. Capture them as soon as the customer asks — biggest source of revenue leakage.</p>
      ) : (
        <div className="divide-y divide-zinc-100">
          {changes.map((c) => (
            <div key={c.id} className="py-2.5 group">
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <div className="flex items-center gap-2">
                  {c.co_number && <span className="text-[11px] font-mono text-zinc-500">CO-{c.co_number}</span>}
                  <select value={c.status} onChange={(e) => patch.mutate({ id: c.id, status: e.target.value })} className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase border-0 cursor-pointer ${CO_BADGES[c.status]}`}>
                    {CO_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                  <span className="text-xs font-semibold text-zinc-900 tabular-nums">{fmt$(c.price_usd)}</span>
                  {c.labor_hours > 0 && <span className="text-[11px] text-zinc-500">{c.labor_hours}h</span>}
                </div>
                <button type="button" onClick={() => remove.mutate({ entity: "change-orders", id: c.id })} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 px-1">×</button>
              </div>
              <p className="text-xs text-zinc-700">{c.description}</p>
              {c.approved_at && c.approver && (
                <p className="text-[11px] text-emerald-700 mt-0.5">✓ Approved by {c.approver} on {fmtDate(c.approved_at)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PunchSection({ jobId, items }: { jobId: string; items: { id: string; description: string; location: string; status: string; completed_at: string | null }[] }) {
  const create = useCreatePunch(jobId);
  const patch = usePatchPunch(jobId);
  const remove = useDeleteEntity();
  const [adding, setAdding] = useState(false);
  const [desc, setDesc] = useState("");
  const [loc, setLoc] = useState("");

  const submit = async () => {
    if (!desc.trim()) return;
    await create.mutateAsync({ description: desc, location: loc });
    setDesc(""); setLoc("");
    setAdding(false);
  };

  const open = items.filter((p) => p.status === "open" || p.status === "in_progress").length;

  return (
    <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Punchlist</h2>
          {open > 0 && <p className="text-[11px] text-amber-700 mt-0.5">{open} open — blocks final payment</p>}
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">
            + Add item
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-zinc-50 border border-zinc-200 rounded p-2 mb-3 space-y-1.5">
          <input autoFocus type="text" placeholder="What needs fixing?" value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
          <input type="text" placeholder="Location (Room 204, North wall, ...)" value={loc} onChange={(e) => setLoc(e.target.value)} className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
          <div className="flex gap-1.5">
            <button type="button" onClick={submit} disabled={create.isPending || !desc.trim()} className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50">
              Add to punchlist
            </button>
            <button type="button" onClick={() => setAdding(false)} className="px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-zinc-400 py-4 text-center">No punchlist items.</p>
      ) : (
        <div className="divide-y divide-zinc-100">
          {items.map((p) => {
            const isDone = p.status === "done" || p.status === "waived";
            return (
              <div key={p.id} className="py-2 flex items-start gap-2 group">
                <input type="checkbox" checked={isDone} onChange={(e) => patch.mutate({ id: p.id, status: e.target.checked ? "done" : "open" })} className="mt-1 cursor-pointer" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <select value={p.status} onChange={(e) => patch.mutate({ id: p.id, status: e.target.value })} className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase border-0 cursor-pointer ${PUNCH_BADGES[p.status]}`}>
                      {PUNCH_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                    </select>
                    <p className={`text-xs ${isDone ? "text-zinc-400 line-through" : "text-zinc-800"}`}>{p.description}</p>
                  </div>
                  {p.location && <p className="text-[11px] text-zinc-500 mt-0.5">📍 {p.location}</p>}
                </div>
                <button type="button" onClick={() => remove.mutate({ entity: "punchlist", id: p.id })} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 px-1">×</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
