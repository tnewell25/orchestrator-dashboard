"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox as InboxIcon,
  Loader2,
  X,
  Zap,
} from "lucide-react";
import {
  useActivity,
  useInbox,
  usePatchReminder,
  useSnoozeReminder,
  useDeleteReminder,
  usePatchAction,
  useApprovePendingAction,
  useRejectPendingAction,
  type ActivityEvent,
  type InboxItem,
  type InboxReminderItem,
  type InboxPendingAction,
  type InboxActionItem,
} from "@/lib/api";

const PERIOD_OPTIONS = [
  { label: "24h", hours: 24 },
  { label: "72h", hours: 72 },
  { label: "7d", hours: 168 },
] as const;

type Tab = "inbox" | "all";

function formatRel(ts: string) {
  const date = new Date(ts);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffMs < 0) {
    // future — flip the calculation
    const futureMins = Math.floor(-diffMs / 60_000);
    const futureHours = Math.floor(-diffMs / 3_600_000);
    const futureDays = Math.floor(-diffMs / 86_400_000);
    if (futureMins < 60) return `in ${futureMins}m`;
    if (futureHours < 24) return `in ${futureHours}h`;
    return `in ${futureDays}d`;
  }
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ----- Inbox view -------------------------------------------------------

function ReminderRow({ item }: { item: InboxReminderItem }) {
  const patch = usePatchReminder();
  const snooze = useSnoozeReminder();
  const remove = useDeleteReminder();

  const overdue = item.is_overdue;
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60 group">
      <div
        className={`shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center ${
          overdue ? "bg-amber-50" : "bg-zinc-100"
        }`}
      >
        <AlertTriangle
          size={11}
          className={overdue ? "text-amber-600" : "text-zinc-400"}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-800 truncate">
            {item.title}
          </span>
          {item.dup_count > 1 && (
            <span className="shrink-0 text-[10px] text-zinc-500 bg-zinc-100 rounded px-1">
              ×{item.dup_count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
          <span className={overdue ? "text-amber-600 font-medium" : ""}>
            {overdue ? "Sent" : "Scheduled"} · {formatRel(item.trigger_at)}
          </span>
          {item.deal_id && (
            <Link
              href={`/deals/${item.deal_id}`}
              className="text-blue-600 hover:text-blue-700 truncate"
            >
              {item.deal_name || "View deal"}
            </Link>
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => patch.mutate({ id: item.id, status: "done" })}
          title="Mark done"
          className="p-1 hover:bg-emerald-50 rounded text-emerald-600"
        >
          <CheckCircle2 size={13} />
        </button>
        <SnoozeMenu onSnooze={(hours) => snooze.mutate({ id: item.id, hours })} />
        <button
          type="button"
          onClick={() => patch.mutate({ id: item.id, status: "cancelled" })}
          title="Dismiss (keep history)"
          className="p-1 hover:bg-zinc-100 rounded text-zinc-500"
        >
          <X size={13} />
        </button>
        <button
          type="button"
          onClick={() => remove.mutate(item.id)}
          title="Delete forever"
          className="p-1 hover:bg-red-50 rounded text-red-500"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function SnoozeMenu({ onSnooze }: { onSnooze: (hours: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Snooze"
        className="p-1 hover:bg-blue-50 rounded text-blue-600"
      >
        <Clock size={13} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-10 bg-white border border-zinc-200 rounded shadow-md py-0.5 w-28"
          onMouseLeave={() => setOpen(false)}
        >
          {[
            { label: "1 hour", h: 1 },
            { label: "Tomorrow", h: 24 },
            { label: "3 days", h: 72 },
            { label: "1 week", h: 168 },
          ].map((opt) => (
            <button
              key={opt.h}
              type="button"
              onClick={() => { onSnooze(opt.h); setOpen(false); }}
              className="w-full text-left px-2.5 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingActionRow({ item }: { item: InboxPendingAction }) {
  const approve = useApprovePendingAction();
  const reject = useRejectPendingAction();
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60 group">
      <div className="shrink-0 mt-0.5 w-5 h-5 rounded bg-violet-50 flex items-center justify-center">
        <Zap size={11} className="text-violet-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-800 truncate">
            {item.title}
          </span>
          <span className="shrink-0 text-[10px] text-violet-700 bg-violet-50 rounded px-1.5 uppercase tracking-wide">
            {item.tool_name}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
          <span>Requested {formatRel(item.created_at)}</span>
          {item.deal_id && (
            <Link
              href={`/deals/${item.deal_id}`}
              className="text-blue-600 hover:text-blue-700 truncate"
            >
              {item.deal_name || "View deal"}
            </Link>
          )}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-1">
        <button
          type="button"
          onClick={() => approve.mutate(item.id)}
          disabled={approve.isPending}
          className="px-2 py-0.5 text-[11px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => reject.mutate(item.id)}
          disabled={reject.isPending}
          className="px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 rounded"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function ActionItemRow({ item }: { item: InboxActionItem }) {
  const patch = usePatchAction(item.deal_id ?? "");
  const overdue =
    item.due_date && new Date(item.due_date).getTime() < Date.now();
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60 group">
      <input
        type="checkbox"
        onChange={(e) =>
          patch.mutate({
            id: item.id,
            status: e.target.checked ? "done" : "open",
          })
        }
        className="mt-1 cursor-pointer"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-800 truncate">{item.title}</p>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
          {item.due_date && (
            <span className={overdue ? "text-red-600 font-medium" : ""}>
              Due {new Date(item.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
          {item.deal_id && (
            <Link
              href={`/deals/${item.deal_id}`}
              className="text-blue-600 hover:text-blue-700 truncate"
            >
              {item.deal_name || "View deal"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function InboxView() {
  const { data, isLoading } = useInbox();
  const items: InboxItem[] = data?.items ?? [];
  const counts = data?.counts;

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <Loader2 size={16} className="inline animate-spin text-zinc-400" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <CheckCircle2 size={24} className="inline text-emerald-400 mb-2" />
        <p className="text-xs text-zinc-500">Inbox zero. Nothing pending.</p>
      </div>
    );
  }

  return (
    <>
      {counts && (
        <div className="flex items-center gap-3 mb-2 text-[11px] text-zinc-500">
          {counts.reminders_overdue > 0 && (
            <span className="text-amber-600 font-medium">
              {counts.reminders_overdue} overdue
            </span>
          )}
          {counts.pending_actions > 0 && (
            <span className="text-violet-600 font-medium">
              {counts.pending_actions} approval{counts.pending_actions !== 1 ? "s" : ""}
            </span>
          )}
          {counts.actions_due > 0 && (
            <span>{counts.actions_due} action{counts.actions_due !== 1 ? "s" : ""} due</span>
          )}
          {counts.reminders_upcoming > 0 && (
            <span>{counts.reminders_upcoming} upcoming</span>
          )}
        </div>
      )}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
        {items.map((item) => {
          if (item.kind === "reminder") return <ReminderRow key={item.id} item={item} />;
          if (item.kind === "pending_action") return <PendingActionRow key={item.id} item={item} />;
          return <ActionItemRow key={item.id} item={item} />;
        })}
      </div>
    </>
  );
}

// ----- All-activity view (existing chronological feed) ----------------

function groupByDate(events: ActivityEvent[]) {
  const groups: Map<string, ActivityEvent[]> = new Map();
  for (const event of events) {
    const dateKey = new Date(event.timestamp).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(event);
  }
  return groups;
}

function AllActivityView({ hours }: { hours: number }) {
  const { data, isLoading } = useActivity(hours);
  const events = data ?? [];
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const grouped = groupByDate(sorted);

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <Loader2 size={16} className="inline animate-spin text-zinc-400" />
      </div>
    );
  }
  if (sorted.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs text-zinc-400">No activity in this period.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
      {Array.from(grouped.entries()).map(([dateLabel, dayEvents]) => (
        <div key={dateLabel}>
          <div className="sticky top-0 bg-zinc-50/90 backdrop-blur-sm px-3 py-1.5 border-b border-zinc-100">
            <span className="text-[11px] font-medium text-zinc-500">{dateLabel}</span>
          </div>
          <div className="divide-y divide-zinc-50">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-2.5 py-2 px-3 hover:bg-zinc-50/60"
              >
                <div className="shrink-0 mt-0.5">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                    {event.type}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-800 truncate">
                    {event.title}
                  </p>
                  {event.detail && (
                    <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">
                      {event.detail}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-zinc-400 tabular-nums">
                      {formatRel(event.timestamp)}
                    </span>
                    {event.deal_id && (
                      <Link
                        href={`/deals/${event.deal_id}`}
                        className="text-[10px] text-blue-500 hover:text-blue-600"
                      >
                        View deal
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ----- Page -----------------------------------------------------------

export default function ActivityPage() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [hours, setHours] = useState(72);
  const inbox = useInbox();
  const overdueCount = inbox.data?.counts?.reminders_overdue ?? 0;
  const actionableCount =
    (inbox.data?.counts?.reminders_overdue ?? 0) +
    (inbox.data?.counts?.pending_actions ?? 0) +
    (inbox.data?.counts?.actions_due ?? 0);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-zinc-800">Activity</h1>
            {overdueCount > 0 && tab !== "inbox" && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                {overdueCount} overdue
              </span>
            )}
          </div>
          {tab === "all" && (
            <div className="flex items-center gap-0.5 bg-white border border-zinc-200 rounded-lg p-0.5">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.hours}
                  type="button"
                  onClick={() => setHours(opt.hours)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    hours === opt.hours
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 bg-white border border-zinc-200 rounded-lg p-0.5 mb-3 w-fit">
          <button
            type="button"
            onClick={() => setTab("inbox")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium transition-colors ${
              tab === "inbox"
                ? "bg-zinc-900 text-white"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <InboxIcon size={11} />
            Inbox
            {actionableCount > 0 && (
              <span className={`text-[10px] tabular-nums ${tab === "inbox" ? "text-zinc-300" : "text-zinc-400"}`}>
                {actionableCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
              tab === "all"
                ? "bg-zinc-900 text-white"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            All activity
          </button>
        </div>

        {tab === "inbox" ? <InboxView /> : <AllActivityView hours={hours} />}
      </div>
    </div>
  );
}
