'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useActivity } from '@/lib/api'
import type { ActivityEvent } from '@/lib/api'

const PERIOD_OPTIONS = [
  { label: '24h', hours: 24 },
  { label: '72h', hours: 72 },
  { label: '7d', hours: 168 },
] as const

const TYPE_ICONS: Record<
  string,
  { bg: string; fg: string; path: string }
> = {
  meeting: {
    bg: 'bg-blue-50',
    fg: 'text-blue-500',
    path: 'M8 0a8 8 0 100 16A8 8 0 008 0zm.5 4.5v3.793l2.354 2.353a.5.5 0 01-.708.708l-2.5-2.5A.5.5 0 017.5 8.5v-4a.5.5 0 011 0z',
  },
  action: {
    bg: 'bg-emerald-50',
    fg: 'text-emerald-500',
    path: 'M8 15A7 7 0 108 1a7 7 0 000 14zm3.354-9.354a.5.5 0 00-.708-.708L7 8.586 5.354 6.94a.5.5 0 10-.708.708l2 2a.5.5 0 00.708 0l4-4z',
  },
  reminder: {
    bg: 'bg-amber-50',
    fg: 'text-amber-500',
    path: 'M8.982 1.566a1.13 1.13 0 00-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5a.905.905 0 00-.9.995l.35 3.507a.553.553 0 001.1 0l.35-3.507A.905.905 0 008 5zm.002 6a1 1 0 100 2 1 1 0 000-2z',
  },
}

const DEFAULT_ICON = {
  bg: 'bg-slate-50',
  fg: 'text-slate-400',
  path: 'M8 15A7 7 0 108 1a7 7 0 000 14zm0-1.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8 4a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 018 4z',
}

function formatTimestamp(ts: string) {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function groupByDate(events: ActivityEvent[]) {
  const groups: Map<string, ActivityEvent[]> = new Map()
  for (const event of events) {
    const dateKey = new Date(event.timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    if (!groups.has(dateKey)) groups.set(dateKey, [])
    groups.get(dateKey)!.push(event)
  }
  return groups
}

function EventItem({ event }: { event: ActivityEvent }) {
  const typeKey = event.type.toLowerCase()
  const icon = TYPE_ICONS[typeKey] ?? DEFAULT_ICON

  return (
    <div className="flex items-start gap-2.5 py-2 px-3 hover:bg-zinc-50/60 transition-colors rounded">
      {/* Icon */}
      <div
        className={`shrink-0 w-5 h-5 rounded flex items-center justify-center mt-0.5 ${icon.bg}`}
      >
        <svg
          className={`w-3 h-3 ${icon.fg}`}
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path fillRule="evenodd" d={icon.path} />
        </svg>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-800 truncate">
            {event.title}
          </span>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wide shrink-0">
            {event.type}
          </span>
        </div>
        {event.detail && (
          <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
            {event.detail}
          </p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-zinc-400 tabular-nums">
            {formatTimestamp(event.timestamp)}
          </span>
          {event.deal_id && (
            <Link
              href={`/deals/${event.deal_id}`}
              className="text-[10px] text-blue-500 hover:text-blue-600 transition-colors"
            >
              View deal
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ActivityPage() {
  const [hours, setHours] = useState(24)
  const { data, isLoading } = useActivity(hours)
  const events: ActivityEvent[] = data ?? []

  const sorted = [...events].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const grouped = groupByDate(sorted)

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-sm font-semibold text-zinc-800">Activity</h1>
          <div className="flex items-center gap-0.5 bg-white border border-zinc-200 rounded-lg p-0.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.hours}
                type="button"
                onClick={() => setHours(opt.hours)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  hours === opt.hours
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Event count */}
        <p className="text-[11px] text-zinc-400 mb-3 tabular-nums">
          {sorted.length} event{sorted.length !== 1 ? 's' : ''}
        </p>

        {/* Feed */}
        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-8 text-center">
              <p className="text-xs text-zinc-400">Loading...</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-zinc-400">
                No activity in this period.
              </p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([dateLabel, dayEvents]) => (
              <div key={dateLabel}>
                {/* Date separator */}
                <div className="sticky top-0 bg-zinc-50/90 backdrop-blur-sm px-3 py-1.5 border-b border-zinc-100">
                  <span className="text-[11px] font-medium text-zinc-500">
                    {dateLabel}
                  </span>
                </div>
                {/* Events for this date */}
                <div className="divide-y divide-zinc-50">
                  {dayEvents.map((event) => (
                    <EventItem key={event.id} event={event} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
