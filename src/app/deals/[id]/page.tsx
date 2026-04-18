'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import {
  useDealDetail,
  usePatchDeal,
  useCreateAction,
  usePatchAction,
  usePatchStakeholder,
  type DealDetailResponse,
  type MeddicData,
  type Stakeholder,
  type Meeting,
  type ActionItemData,
} from '@/lib/api'

const STAGE_ORDER = [
  'prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost',
] as const

const STAGE_COLORS: Record<string, string> = {
  prospect: 'bg-slate-100 text-slate-700',
  qualified: 'bg-blue-50 text-blue-700',
  proposal: 'bg-violet-50 text-violet-700',
  negotiation: 'bg-amber-50 text-amber-700',
  closed_won: 'bg-emerald-50 text-emerald-700',
  closed_lost: 'bg-red-50 text-red-700',
}

const SENTIMENT_OPTIONS = ['supportive', 'neutral', 'opposed', 'unknown'] as const
const INFLUENCE_OPTIONS = ['low', 'medium', 'high'] as const

const SENTIMENT_COLORS: Record<string, string> = {
  supportive: 'bg-emerald-500',
  neutral: 'bg-amber-400',
  opposed: 'bg-red-500',
  unknown: 'bg-slate-300',
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700',
  done: 'bg-emerald-50 text-emerald-700',
  snoozed: 'bg-amber-50 text-amber-700',
}

function stageColor(stage: string) {
  return STAGE_COLORS[stage] ?? 'bg-slate-100 text-slate-600'
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
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// --- Inline editor primitives ----------------------------------------

function EditableText({
  value, placeholder, onSave, multiline = false, className = '',
}: {
  value: string
  placeholder?: string
  onSave: (next: string) => Promise<unknown> | unknown
  multiline?: boolean
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = async () => {
    if (draft !== value) await onSave(draft)
    setEditing(false)
  }

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={() => { setDraft(value); setEditing(true) }}
        onKeyDown={(e) => { if (e.key === 'Enter') { setDraft(value); setEditing(true) } }}
        className={`cursor-text rounded hover:bg-zinc-100/70 px-1 -mx-1 ${value ? 'text-zinc-700' : 'text-zinc-400 italic'} ${className}`}
        title="Click to edit"
      >
        {value || placeholder || 'Click to add'}
      </span>
    )
  }

  if (multiline) {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
        rows={3}
        className={`w-full px-1 -mx-1 text-xs bg-white border border-zinc-300 rounded focus:outline-none focus:border-zinc-500 ${className}`}
      />
    )
  }
  return (
    <input
      autoFocus
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
      }}
      className={`w-full px-1 -mx-1 text-xs bg-white border border-zinc-300 rounded focus:outline-none focus:border-zinc-500 ${className}`}
    />
  )
}

// --- Header (stage dropdown + inline value) ---------------------------

function DealHeader({
  deal, onPatch,
}: {
  deal: DealDetailResponse['deal']
  onPatch: (p: Record<string, unknown>) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <EditableText
            value={deal.name}
            onSave={(name) => onPatch({ name })}
            className="text-base font-semibold text-zinc-900"
          />
          <select
            value={deal.stage}
            onChange={(e) => onPatch({ stage: e.target.value })}
            className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-medium border-0 cursor-pointer ${stageColor(deal.stage)}`}
          >
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">{deal.company}</p>
      </div>
      <div className="text-right shrink-0">
        <EditableText
          value={String(deal.value_usd || 0)}
          onSave={(v) => onPatch({ value_usd: Number(v) || 0 })}
          className="text-sm font-semibold text-zinc-900 tabular-nums"
        />
        <span className="text-sm font-semibold text-zinc-900 tabular-nums ml-1">
          ({formatCurrency(deal.value_usd)})
        </span>
        {deal.close_date && (
          <p className="mt-0.5 text-[11px] text-zinc-400">
            Close {formatDate(deal.close_date)}
          </p>
        )}
      </div>
    </div>
  )
}

// --- MEDDIC ------------------------------------------------------------

function MeddicScorecard({
  meddic, onPatch,
}: {
  meddic: MeddicData
  onPatch: (p: Record<string, unknown>) => void
}) {
  const fields: { label: string; key: keyof MeddicData; editable: boolean }[] = [
    { label: 'Metrics', key: 'metrics', editable: true },
    { label: 'Economic Buyer', key: 'economic_buyer', editable: false },
    { label: 'Champion', key: 'champion', editable: false },
    { label: 'Decision Criteria', key: 'decision_criteria', editable: true },
    { label: 'Decision Process', key: 'decision_process', editable: true },
    { label: 'Paper Process', key: 'paper_process', editable: true },
    { label: 'Pain', key: 'pain', editable: true },
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
          const value = meddic[f.key]?.trim() ?? ''
          const isFilled = !!value
          return (
            <div
              key={f.key}
              className={`px-2.5 py-2 rounded border text-xs ${
                isFilled
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-red-200 bg-red-50/40'
              }`}
            >
              <div className="text-[11px] font-medium text-zinc-700 mb-0.5">
                {f.label}
              </div>
              {f.editable ? (
                <EditableText
                  value={value}
                  placeholder={isFilled ? '' : 'Missing — click to add'}
                  onSave={(next) => onPatch({ [f.key]: next })}
                  multiline
                  className="text-[11px] block"
                />
              ) : (
                <span className={`text-[11px] block ${isFilled ? 'text-zinc-600' : 'text-red-500'}`}>
                  {value || 'Missing'}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --- Stakeholders ------------------------------------------------------

function StakeholderTable({
  stakeholders, dealId,
}: {
  stakeholders: Stakeholder[]
  dealId: string
}) {
  const patch = usePatchStakeholder(dealId)

  if (!stakeholders.length) {
    return <p className="text-xs text-zinc-400 py-3">No stakeholders mapped yet.</p>
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
            <tr key={s.id} className="border-b border-zinc-100 last:border-0">
              <td className="py-1.5 pr-3 font-medium text-zinc-800">{s.name}</td>
              <td className="py-1.5 pr-3 text-zinc-500">{s.title}</td>
              <td className="py-1.5 pr-3">
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">
                  {s.role}
                </span>
              </td>
              <td className="py-1.5 pr-3">
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${SENTIMENT_COLORS[s.sentiment.toLowerCase()] ?? SENTIMENT_COLORS.unknown}`} />
                  <select
                    value={s.sentiment}
                    onChange={(e) => patch.mutate({ id: s.id, sentiment: e.target.value })}
                    className="bg-transparent text-zinc-600 capitalize border-0 cursor-pointer focus:outline-none"
                  >
                    {SENTIMENT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </span>
              </td>
              <td className="py-1.5 capitalize">
                <select
                  value={s.influence}
                  onChange={(e) => patch.mutate({ id: s.id, influence: e.target.value })}
                  className="bg-transparent text-zinc-600 capitalize border-0 cursor-pointer focus:outline-none"
                >
                  {INFLUENCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- Meetings ----------------------------------------------------------

function MeetingTimeline({ meetings }: { meetings: Meeting[] }) {
  if (!meetings.length) {
    return <p className="text-xs text-zinc-400 py-3">No meetings recorded.</p>
  }
  const sorted = [...meetings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  return (
    <div className="space-y-2">
      {sorted.map((m) => (
        <div key={m.id} className="py-2 border-b border-zinc-100 last:border-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] text-zinc-400 tabular-nums shrink-0">
              {formatDate(m.date)}
            </span>
            {m.attendees && (
              <span className="text-[11px] text-zinc-400 truncate">{m.attendees}</span>
            )}
          </div>
          {m.summary && (
            <p className="text-xs text-zinc-700 leading-relaxed">{m.summary}</p>
          )}
          {m.decisions && (
            <p className="text-[11px] text-zinc-500 mt-0.5">
              <span className="font-medium text-zinc-600">Decisions:</span> {m.decisions}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// --- Action items ------------------------------------------------------

function ActionItems({
  items, dealId,
}: {
  items: ActionItemData[]
  dealId: string
}) {
  const patch = usePatchAction(dealId)
  const create = useCreateAction(dealId)
  const [adding, setAdding] = useState(false)
  const [draftDesc, setDraftDesc] = useState('')
  const [draftDue, setDraftDue] = useState('')

  const submit = async () => {
    if (!draftDesc.trim()) return
    await create.mutateAsync({
      description: draftDesc.trim(),
      due_date: draftDue || undefined,
    })
    setDraftDesc(''); setDraftDue(''); setAdding(false)
  }

  return (
    <div>
      <div className="space-y-1">
        {items.map((item) => {
          const statusKey = item.status.toLowerCase()
          const style = STATUS_STYLES[statusKey] ?? 'bg-slate-50 text-slate-600'
          const isDone = statusKey === 'done'
          return (
            <div
              key={item.id}
              className="flex items-start gap-2 py-1.5 border-b border-zinc-100 last:border-0"
            >
              <input
                type="checkbox"
                checked={isDone}
                onChange={(e) =>
                  patch.mutate({
                    id: item.id,
                    status: e.target.checked ? 'done' : 'open',
                  })
                }
                className="mt-1 cursor-pointer"
              />
              <span
                className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${style}`}
              >
                {item.status}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-xs ${isDone ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                  {item.description}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                  {item.due_date && <span>Due {formatDate(item.due_date)}</span>}
                  {item.source && <span>from {item.source}</span>}
                </div>
              </div>
            </div>
          )
        })}
        {!items.length && (
          <p className="text-xs text-zinc-400 py-2">No action items.</p>
        )}
      </div>

      {adding ? (
        <div className="mt-3 p-2 bg-zinc-50 border border-zinc-200 rounded">
          <input
            autoFocus
            type="text"
            placeholder="What needs to happen?"
            value={draftDesc}
            onChange={(e) => setDraftDesc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') setAdding(false)
            }}
            className="w-full mb-1.5 px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
          />
          <div className="flex gap-1.5">
            <input
              type="date"
              value={draftDue}
              onChange={(e) => setDraftDue(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
            />
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending || !draftDesc.trim()}
              className="px-3 py-1 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 text-[11px] text-blue-600 hover:text-blue-700 font-medium"
        >
          + Add action
        </button>
      )}
    </div>
  )
}

function Section({
  title, children,
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

// --- Page --------------------------------------------------------------

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data, isLoading } = useDealDetail(id)
  const patch = usePatchDeal()

  const onPatch = (p: Record<string, unknown>) => patch.mutate({ id, ...p })

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
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors mb-4"
        >
          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M11.354 1.646a.5.5 0 010 .708L5.707 8l5.647 5.646a.5.5 0 01-.708.708l-6-6a.5.5 0 010-.708l6-6a.5.5 0 01.708 0z"
            />
          </svg>
          Pipeline
        </Link>

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm px-5 py-4">
          <DealHeader deal={deal} onPatch={onPatch} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4 border-b border-zinc-200 text-xs">
            <div>
              <span className="text-zinc-400 text-[11px] block mb-0.5">Next Step</span>
              <EditableText
                value={deal.next_step || ''}
                placeholder="What's next?"
                onSave={(v) => onPatch({ next_step: v })}
                multiline
              />
            </div>
            <div>
              <span className="text-zinc-400 text-[11px] block mb-0.5">Competitors</span>
              <EditableText
                value={deal.competitors || ''}
                placeholder="Add competitors"
                onSave={(v) => onPatch({ competitors: v })}
              />
            </div>
            <div>
              <span className="text-zinc-400 text-[11px] block mb-0.5">Notes</span>
              <EditableText
                value={deal.notes || ''}
                placeholder="Add notes"
                onSave={(v) => onPatch({ notes: v })}
                multiline
              />
            </div>
          </div>

          <div className="py-4 border-b border-zinc-200">
            <MeddicScorecard meddic={meddic} onPatch={onPatch} />
          </div>

          <Section title="Stakeholders">
            <StakeholderTable stakeholders={stakeholders} dealId={id} />
          </Section>

          <Section title="Meetings">
            <MeetingTimeline meetings={meetings} />
          </Section>

          <Section title="Action Items">
            <ActionItems items={action_items} dealId={id} />
          </Section>

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
