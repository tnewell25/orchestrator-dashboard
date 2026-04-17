'use client'

import { use, Fragment } from 'react'
import Link from 'next/link'
import { useDealDetail } from '@/lib/api'
import type {
  DealDetailResponse,
  MeddicData,
  Stakeholder,
  Meeting,
  ActionItemData,
} from '@/lib/api'

const STAGE_COLORS: Record<string, string> = {
  prospecting: 'bg-slate-100 text-slate-700',
  qualification: 'bg-blue-50 text-blue-700',
  discovery: 'bg-indigo-50 text-indigo-700',
  proposal: 'bg-violet-50 text-violet-700',
  negotiation: 'bg-amber-50 text-amber-700',
  'closed-won': 'bg-emerald-50 text-emerald-700',
  'closed-lost': 'bg-red-50 text-red-700',
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'bg-emerald-500',
  neutral: 'bg-amber-400',
  negative: 'bg-red-500',
  unknown: 'bg-slate-300',
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700',
  done: 'bg-emerald-50 text-emerald-700',
  snoozed: 'bg-amber-50 text-amber-700',
}

function stageColor(stage: string) {
  const key = stage.toLowerCase().replace(/\s+/g, '-')
  return STAGE_COLORS[key] ?? 'bg-slate-100 text-slate-600'
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(date: string | null) {
  if (!date) return '--'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// --- Sub-components ---

function DealHeader({ deal }: { deal: DealDetailResponse["deal"] }) {
  return (
    <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-semibold text-zinc-900 truncate">
            {deal.name}
          </h1>
          <span
            className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-medium ${stageColor(deal.stage)}`}
          >
            {deal.stage}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">{deal.company}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-zinc-900 tabular-nums">
          {formatCurrency(deal.value_usd)}
        </p>
        {deal.close_date && (
          <p className="mt-0.5 text-[11px] text-zinc-400">
            Close {formatDate(deal.close_date)}
          </p>
        )}
      </div>
    </div>
  )
}

function MeddicScorecard({ meddic }: { meddic: MeddicData }) {
  const fields: { label: string; key: keyof MeddicData }[] = [
    { label: 'Metrics', key: 'metrics' },
    { label: 'Economic Buyer', key: 'economic_buyer' },
    { label: 'Champion', key: 'champion' },
    { label: 'Decision Criteria', key: 'decision_criteria' },
    { label: 'Decision Process', key: 'decision_process' },
    { label: 'Paper Process', key: 'paper_process' },
    { label: 'Pain', key: 'pain' },
  ]

  const filled = fields.filter((f) => meddic[f.key]?.trim()).length

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
          MEDDIC Scorecard
        </h2>
        <span className="text-[11px] text-zinc-400 tabular-nums">
          {filled}/{fields.length} complete
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
        {fields.map((f) => {
          const value = meddic[f.key]?.trim()
          const isFilled = !!value
          return (
            <div
              key={f.key}
              className={`px-2.5 py-2 rounded border text-xs ${
                isFilled
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-red-200 bg-red-50/40'
              }`}
              title={value || undefined}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                {isFilled ? (
                  <svg
                    className="w-3 h-3 text-emerald-600 shrink-0"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 15A7 7 0 108 1a7 7 0 000 14zm3.354-9.354a.5.5 0 00-.708-.708L7 8.586 5.354 6.94a.5.5 0 10-.708.708l2 2a.5.5 0 00.708 0l4-4z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-3 h-3 text-red-400 shrink-0"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 15A7 7 0 108 1a7 7 0 000 14zM5.354 5.354a.5.5 0 01.708 0L8 7.293l1.938-1.939a.5.5 0 11.708.708L8.707 8l1.939 1.938a.5.5 0 01-.708.708L8 8.707l-1.938 1.939a.5.5 0 01-.708-.708L7.293 8 5.354 6.062a.5.5 0 010-.708z"
                    />
                  </svg>
                )}
                <span className="font-medium text-zinc-700">{f.label}</span>
              </div>
              {isFilled ? (
                <p className="text-[11px] text-zinc-500 line-clamp-2 pl-[18px]">
                  {value}
                </p>
              ) : (
                <span className="text-[11px] font-medium text-red-500 pl-[18px]">
                  Missing
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StakeholderTable({
  stakeholders,
}: {
  stakeholders: Stakeholder[]
}) {
  if (!stakeholders.length) {
    return (
      <p className="text-xs text-zinc-400 py-3">No stakeholders mapped yet.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-[11px] text-zinc-400 uppercase tracking-wider">
            <th className="py-1.5 pr-3 font-medium">Name</th>
            <th className="py-1.5 pr-3 font-medium">Title</th>
            <th className="py-1.5 pr-3 font-medium">Role</th>
            <th className="py-1.5 pr-3 font-medium">Sentiment</th>
            <th className="py-1.5 font-medium">Influence</th>
          </tr>
        </thead>
        <tbody>
          {stakeholders.map((s) => (
            <tr
              key={s.contact_id}
              className="border-b border-zinc-100 last:border-0"
            >
              <td className="py-1.5 pr-3 font-medium text-zinc-800">
                {s.name}
              </td>
              <td className="py-1.5 pr-3 text-zinc-500">{s.title}</td>
              <td className="py-1.5 pr-3">
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">
                  {s.role}
                </span>
              </td>
              <td className="py-1.5 pr-3">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${SENTIMENT_COLORS[s.sentiment.toLowerCase()] ?? SENTIMENT_COLORS.unknown}`}
                  />
                  <span className="text-zinc-600 capitalize">
                    {s.sentiment}
                  </span>
                </span>
              </td>
              <td className="py-1.5 text-zinc-600 capitalize">
                {s.influence}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MeetingTimeline({ meetings }: { meetings: Meeting[] }) {
  if (!meetings.length) {
    return (
      <p className="text-xs text-zinc-400 py-3">No meetings recorded.</p>
    )
  }

  const sorted = [...meetings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="space-y-2">
      {sorted.map((m) => (
        <div
          key={m.id}
          className="py-2 border-b border-zinc-100 last:border-0"
        >
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] text-zinc-400 tabular-nums shrink-0">
              {formatDate(m.date)}
            </span>
            {m.attendees && (
              <span className="text-[11px] text-zinc-400 truncate">
                {m.attendees}
              </span>
            )}
          </div>
          {m.summary && (
            <p className="text-xs text-zinc-700 leading-relaxed">
              {m.summary}
            </p>
          )}
          {m.decisions && (
            <p className="text-[11px] text-zinc-500 mt-0.5">
              <span className="font-medium text-zinc-600">Decisions:</span>{' '}
              {m.decisions}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function ActionItems({ items }: { items: ActionItemData[] }) {
  if (!items.length) {
    return (
      <p className="text-xs text-zinc-400 py-3">No action items.</p>
    )
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const statusKey = item.status.toLowerCase()
        const style =
          STATUS_STYLES[statusKey] ?? 'bg-slate-50 text-slate-600'
        return (
          <div
            key={item.id}
            className="flex items-start gap-2 py-1.5 border-b border-zinc-100 last:border-0"
          >
            <span
              className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${style}`}
            >
              {item.status}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-zinc-800">{item.description}</p>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                {item.due_date && <span>Due {formatDate(item.due_date)}</span>}
                {item.source && <span>from {item.source}</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="py-4 border-b border-zinc-200 last:border-0">
      <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-2">
        {title}
      </h2>
      {children}
    </div>
  )
}

// --- Page ---

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data, isLoading } = useDealDetail(id)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-xs text-zinc-400">Loading...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-xs text-zinc-500">Deal not found.</p>
      </div>
    )
  }

  const { deal, meddic, stakeholders, meetings, action_items, bids } = data as DealDetailResponse

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors mb-4"
        >
          <svg
            className="w-3 h-3"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M11.354 1.646a.5.5 0 010 .708L5.707 8l5.647 5.646a.5.5 0 01-.708.708l-6-6a.5.5 0 010-.708l6-6a.5.5 0 01.708 0z"
            />
          </svg>
          Pipeline
        </Link>

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm px-5 py-4">
          <DealHeader deal={deal} />

          {/* Deal info row */}
          {(deal.next_step || deal.competitors || deal.notes) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4 border-b border-zinc-200 text-xs">
              {deal.next_step && (
                <div>
                  <span className="text-zinc-400 text-[11px]">Next Step</span>
                  <p className="text-zinc-700 mt-0.5">{deal.next_step}</p>
                </div>
              )}
              {deal.competitors && (
                <div>
                  <span className="text-zinc-400 text-[11px]">Competitors</span>
                  <p className="text-zinc-700 mt-0.5">{deal.competitors}</p>
                </div>
              )}
              {deal.notes && (
                <div>
                  <span className="text-zinc-400 text-[11px]">Notes</span>
                  <p className="text-zinc-700 mt-0.5 line-clamp-3">
                    {deal.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* MEDDIC */}
          <div className="py-4 border-b border-zinc-200">
            <MeddicScorecard meddic={meddic} />
          </div>

          {/* Stakeholders */}
          <Section title="Stakeholders">
            <StakeholderTable stakeholders={stakeholders} />
          </Section>

          {/* Meetings */}
          <Section title="Meetings">
            <MeetingTimeline meetings={meetings} />
          </Section>

          {/* Action Items */}
          <Section title="Action Items">
            <ActionItems items={action_items} />
          </Section>

          {/* Bids */}
          {bids && bids.length > 0 && (
            <Section title="Bids">
              <div className="space-y-1">
                {bids.map((bid) => (
                  <div
                    key={bid.id}
                    className="flex items-center justify-between py-1.5 border-b border-zinc-100 last:border-0 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                          bid.stage === 'won'
                            ? 'bg-emerald-50 text-emerald-700'
                            : bid.stage === 'lost'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {bid.stage}
                      </span>
                      <span className="text-zinc-800 font-medium">{bid.name}</span>
                      <span className="text-zinc-500 tabular-nums">
                        {formatCurrency(bid.value_usd)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                      {bid.submission_deadline && (
                        <span className="shrink-0 tabular-nums">
                          {formatDate(bid.submission_deadline!)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}
