'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useDealDetail,
  useDealHealth,
  useDealAudit,
  usePatchDeal,
  useCreateAction,
  usePatchAction,
  usePatchStakeholder,
  useCreateStakeholder,
  useCreateMeeting,
  useDeleteEntity,
  useSuggestMeddic,
  useGenerateBrief,
  useContacts,
  type DealDetailResponse,
  type MeddicData,
  type Stakeholder,
  type Meeting,
  type ActionItemData,
  type DealAuditItem,
} from '@/lib/api'
import { useConfirmDestroy } from '@/components/confirm-destroy'

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

// Industrial buying-committee taxonomy. Surface every role the backend accepts.
const ROLE_OPTIONS = [
  'champion', 'economic_buyer', 'technical_buyer', 'blocker', 'coach', 'user',
  'ot_cyber', 'it_cyber', 'operations', 'maintenance',
  'procurement', 'legal', 'finance', 'parent_company_standards',
] as const

const ROLE_LABELS: Record<string, string> = {
  champion: 'Champion',
  economic_buyer: 'Economic Buyer',
  technical_buyer: 'Technical Buyer',
  blocker: 'Blocker',
  coach: 'Coach',
  user: 'User',
  ot_cyber: 'OT Cyber',
  it_cyber: 'IT Cyber',
  operations: 'Operations',
  maintenance: 'Maintenance',
  procurement: 'Procurement',
  legal: 'Legal',
  finance: 'Finance',
  parent_company_standards: 'Parent-Co Standards',
}

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

// --- Health bar (forecast bucket + meddic + champion + slip) ----------

function HealthBar({ dealId }: { dealId: string }) {
  const { data } = useDealHealth(dealId)
  if (!data) return null

  const bucketStyle =
    data.forecast_bucket === 'commit'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : data.forecast_bucket === 'best_case'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-zinc-100 text-zinc-700 border-zinc-200'
  const bucketLabel =
    data.forecast_bucket === 'commit' ? 'Commit'
    : data.forecast_bucket === 'best_case' ? 'Best Case'
    : 'Pipeline'

  const meddicTone = data.meddic_pct >= 70 ? 'text-emerald-700' : data.meddic_pct >= 40 ? 'text-amber-700' : 'text-red-600'
  const champTone = data.champion_score >= 70 ? 'text-emerald-700' : data.champion_score >= 40 ? 'text-amber-700' : 'text-red-600'
  const slipTone = data.slip_risk >= 70 ? 'text-red-600' : data.slip_risk >= 40 ? 'text-amber-700' : 'text-emerald-700'

  return (
    <div className="flex items-center flex-wrap gap-2 py-3 border-b border-zinc-200 text-[11px]">
      <span className={`px-2 py-0.5 rounded font-medium border ${bucketStyle}`}>
        {bucketLabel}
      </span>
      <span className={meddicTone}>MEDDIC {data.meddic_pct}%</span>
      <span className={champTone} title={data.champion_detail}>
        Champion {data.champion_score}/100
      </span>
      <span className={slipTone} title="Probability of slipping past the close date">
        Slip {data.slip_risk}%
      </span>
      {data.meddic_missing.length > 0 && (
        <span className="text-zinc-400">
          missing: {data.meddic_missing.slice(0, 3).join(', ')}
        </span>
      )}
      {data.reasons.length > 0 && (
        <span className="text-zinc-500 ml-auto truncate max-w-md">
          {data.reasons.join(' · ')}
        </span>
      )}
    </div>
  )
}

// --- Header (stage dropdown + inline value) ---------------------------

function DealHeader({
  deal, onPatch, onDelete, onGenerateBrief,
}: {
  deal: DealDetailResponse['deal']
  onPatch: (p: Record<string, unknown>) => void
  onDelete: () => void
  onGenerateBrief: () => void
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
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="text-right">
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
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onGenerateBrief}
            className="px-2 py-0.5 text-[11px] font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded"
            title="Generate a meeting-prep one-pager from current deal context"
          >
            Brief
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-50 rounded"
          >
            Delete
          </button>
        </div>
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

function StakeholdersSection({
  stakeholders, dealId,
}: {
  stakeholders: Stakeholder[]
  dealId: string
}) {
  const [view, setView] = useState<'table' | 'map'>('table')
  const [adding, setAdding] = useState(false)
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-0.5 bg-zinc-100 rounded p-0.5">
          <button
            type="button"
            onClick={() => setView('table')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium ${view === 'table' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            Table
          </button>
          <button
            type="button"
            onClick={() => setView('map')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium ${view === 'map' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            Map
          </button>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add stakeholder
          </button>
        )}
      </div>

      {adding && (
        <AddStakeholderForm
          dealId={dealId}
          existingContactIds={new Set(stakeholders.map((s) => s.contact_id))}
          onClose={() => setAdding(false)}
        />
      )}

      {view === 'table' ? (
        <StakeholderTable stakeholders={stakeholders} dealId={dealId} />
      ) : (
        <StakeholderMap stakeholders={stakeholders} />
      )}
    </div>
  )
}

function AddStakeholderForm({
  dealId, existingContactIds, onClose,
}: {
  dealId: string
  existingContactIds: Set<string>
  onClose: () => void
}) {
  const [contactQuery, setContactQuery] = useState('')
  const [contactId, setContactId] = useState('')
  const [contactName, setContactName] = useState('')
  const [role, setRole] = useState<string>('champion')
  const [sentiment, setSentiment] = useState<string>('unknown')
  const [influence, setInfluence] = useState<string>('medium')
  const create = useCreateStakeholder(dealId)
  const { data: contactResults } = useContacts(contactQuery)
  const filteredContacts = (contactResults ?? []).filter(
    (c) => !contactId && (!existingContactIds.has(c.id) || c.id === contactId),
  )

  const submit = async () => {
    if (!contactId) return
    await create.mutateAsync({
      contact_id: contactId, role, sentiment, influence,
    })
    onClose()
  }

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded p-2 mb-3 space-y-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-zinc-700">Add stakeholder</span>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-zinc-400 hover:text-zinc-600"
        >
          Cancel
        </button>
      </div>
      {!contactId ? (
        <div className="relative">
          <input
            autoFocus
            type="text"
            placeholder="Search contact by name or email..."
            value={contactQuery}
            onChange={(e) => setContactQuery(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
          />
          {contactQuery && filteredContacts.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-0.5 z-10 bg-white border border-zinc-200 rounded shadow-md max-h-48 overflow-y-auto">
              {filteredContacts.slice(0, 8).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setContactId(c.id)
                    setContactName(c.name)
                    setContactQuery('')
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-zinc-50 flex items-center justify-between"
                >
                  <span className="text-zinc-800 font-medium">{c.name}</span>
                  <span className="text-[11px] text-zinc-400 truncate ml-2">
                    {c.title}
                  </span>
                </button>
              ))}
            </div>
          )}
          {contactQuery && filteredContacts.length === 0 && (
            <p className="text-[11px] text-zinc-400 mt-1">
              No contacts match. Create one in Contacts first.
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between bg-white border border-zinc-200 rounded px-2 py-1">
          <span className="text-xs text-zinc-800">{contactName}</span>
          <button
            type="button"
            onClick={() => { setContactId(''); setContactName('') }}
            className="text-[11px] text-zinc-400 hover:text-zinc-600"
          >
            Change
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <select
          value={sentiment}
          onChange={(e) => setSentiment(e.target.value)}
          className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 capitalize"
        >
          {SENTIMENT_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={influence}
          onChange={(e) => setInfluence(e.target.value)}
          className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 capitalize"
        >
          {INFLUENCE_OPTIONS.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={create.isPending || !contactId}
        className="w-full py-1 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50"
      >
        {create.isPending ? 'Adding...' : 'Add to deal'}
      </button>
    </div>
  )
}

function StakeholderMap({ stakeholders }: { stakeholders: Stakeholder[] }) {
  if (!stakeholders.length) {
    return <p className="text-xs text-zinc-400 py-3">No stakeholders mapped yet.</p>
  }

  // Layout: champion(s) center, EB top, technical/coach left, blockers/cyber right, others bottom.
  const groups: Record<string, Stakeholder[]> = {
    top: [],     // economic buyer + parent_company_standards
    center: [],  // champion
    left: [],    // technical_buyer, coach, user
    right: [],   // blocker, ot_cyber, it_cyber
    bottom: [],  // operations, maintenance, procurement, legal, finance
  }
  for (const s of stakeholders) {
    if (s.role === 'economic_buyer' || s.role === 'parent_company_standards') groups.top.push(s)
    else if (s.role === 'champion') groups.center.push(s)
    else if (['technical_buyer', 'coach', 'user'].includes(s.role)) groups.left.push(s)
    else if (['blocker', 'ot_cyber', 'it_cyber'].includes(s.role)) groups.right.push(s)
    else groups.bottom.push(s)
  }

  return (
    <div className="bg-zinc-50/70 border border-zinc-200 rounded-lg p-4">
      <div className="grid grid-cols-3 gap-3 items-stretch">
        <div /> {/* spacer */}
        <div className="space-y-1.5">
          {groups.top.map((s) => <MapNode key={s.id} s={s} />)}
        </div>
        <div /> {/* spacer */}

        <div className="space-y-1.5">
          {groups.left.map((s) => <MapNode key={s.id} s={s} />)}
        </div>
        <div className="space-y-1.5">
          {groups.center.map((s) => <MapNode key={s.id} s={s} highlight />)}
          {groups.center.length === 0 && (
            <div className="border-2 border-dashed border-red-300 bg-red-50/30 rounded p-2 text-center">
              <p className="text-[11px] font-medium text-red-600">No champion mapped</p>
              <p className="text-[10px] text-red-500/80 mt-0.5">
                The single biggest predictor of deal slip
              </p>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          {groups.right.map((s) => <MapNode key={s.id} s={s} />)}
        </div>
      </div>

      {groups.bottom.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {groups.bottom.map((s) => <MapNode key={s.id} s={s} compact />)}
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-zinc-200 flex items-center gap-3 text-[10px] text-zinc-400">
        <span>Sentiment:</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> supportive</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> neutral</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> opposed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" /> unknown</span>
        <span className="ml-auto">Border thickness = influence</span>
      </div>
    </div>
  )
}

function MapNode({ s, highlight, compact }: { s: Stakeholder; highlight?: boolean; compact?: boolean }) {
  const sentimentColor = SENTIMENT_COLORS[s.sentiment.toLowerCase()] ?? SENTIMENT_COLORS.unknown
  const borderClass =
    s.influence === 'high' ? 'border-2' : s.influence === 'medium' ? 'border' : 'border border-dashed'
  const ringClass = highlight ? 'ring-2 ring-emerald-300 ring-offset-1' : ''
  return (
    <div
      className={`bg-white rounded ${borderClass} border-zinc-300 ${ringClass} ${compact ? 'p-1.5' : 'p-2'} text-left`}
      title={`${s.role} · ${s.sentiment} · ${s.influence} influence`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sentimentColor}`} />
        <span className={`font-medium text-zinc-800 truncate ${compact ? 'text-[11px]' : 'text-xs'}`}>
          {s.name}
        </span>
      </div>
      <p className={`text-zinc-500 truncate ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
        {ROLE_LABELS[s.role] ?? s.role}
        {s.title && ` · ${s.title}`}
      </p>
    </div>
  )
}

function StakeholderTable({
  stakeholders, dealId,
}: {
  stakeholders: Stakeholder[]
  dealId: string
}) {
  const patch = usePatchStakeholder(dealId)
  const remove = useDeleteEntity()

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
            <th className="py-1.5 pr-3 font-medium">Influence</th>
            <th className="py-1.5 w-6" />
          </tr>
        </thead>
        <tbody>
          {stakeholders.map((s) => (
            <tr key={s.id} className="border-b border-zinc-100 last:border-0 group">
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
              <td className="py-1.5 pr-3 capitalize">
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
              <td className="py-1.5 text-right">
                <button
                  type="button"
                  onClick={() => remove.mutate({ entity: "stakeholders", id: s.id })}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-600 px-1"
                  title="Remove from deal"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- Meetings ----------------------------------------------------------

function MeetingTimeline({ meetings, dealId }: { meetings: Meeting[]; dealId: string }) {
  const create = useCreateMeeting(dealId)
  const remove = useDeleteEntity()
  const patch = usePatchDeal()
  const suggest = useSuggestMeddic()
  const [adding, setAdding] = useState(false)
  const [attendees, setAttendees] = useState('')
  const [summary, setSummary] = useState('')
  const [decisions, setDecisions] = useState('')
  const [suggestionFor, setSuggestionFor] = useState<string | null>(null)
  const [suggestionData, setSuggestionData] = useState<Record<string, string> | null>(null)
  const [suggestionRationale, setSuggestionRationale] = useState<string>('')

  const runSuggest = async (meetingId: string) => {
    setSuggestionFor(meetingId)
    setSuggestionData(null)
    setSuggestionRationale('')
    try {
      const res = await suggest.mutateAsync(meetingId)
      setSuggestionData(res.suggestions)
      setSuggestionRationale(res.rationale)
    } catch (e) {
      alert((e as Error).message)
      setSuggestionFor(null)
    }
  }

  const applyAll = async (deal_id: string) => {
    if (!suggestionData) return
    await patch.mutateAsync({ id: deal_id, ...suggestionData })
    setSuggestionFor(null)
    setSuggestionData(null)
  }

  const submit = async () => {
    if (!summary.trim() && !attendees.trim()) return
    await create.mutateAsync({ attendees, summary, decisions })
    setAttendees(''); setSummary(''); setDecisions(''); setAdding(false)
  }

  const sorted = [...meetings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  return (
    <div>
      <div className="space-y-2 mb-2">
        {sorted.length === 0 ? (
          <p className="text-xs text-zinc-400 py-2">No meetings recorded.</p>
        ) : (
          sorted.map((m) => (
            <div key={m.id} className="py-2 border-b border-zinc-100 last:border-0 group">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
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
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => runSuggest(m.id)}
                    disabled={suggest.isPending && suggestionFor === m.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-100"
                    title="Use the agent to suggest MEDDIC field updates from this meeting"
                  >
                    {suggest.isPending && suggestionFor === m.id ? '...' : 'AI MEDDIC'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate({ entity: 'meetings', id: m.id })}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-600 px-1"
                    title="Delete meeting"
                  >
                    ×
                  </button>
                </div>
              </div>
              {suggestionFor === m.id && suggestionData && (
                <div className="mt-2 ml-2 p-2 bg-violet-50/60 border border-violet-200 rounded">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium text-violet-800 uppercase tracking-wide">
                      Suggested MEDDIC updates
                    </span>
                    <button
                      type="button"
                      onClick={() => { setSuggestionFor(null); setSuggestionData(null); }}
                      className="text-[11px] text-zinc-400 hover:text-zinc-600"
                    >
                      ×
                    </button>
                  </div>
                  {Object.keys(suggestionData).length === 0 ? (
                    <p className="text-[11px] text-zinc-500">
                      Agent found no concrete MEDDIC updates from this meeting.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-1.5 mb-2">
                        {Object.entries(suggestionData).map(([k, v]) => (
                          <div key={k} className="text-[11px]">
                            <span className="font-medium text-zinc-700 capitalize">{k.replace('_', ' ')}:</span>{' '}
                            <span className="text-zinc-600">{v}</span>
                          </div>
                        ))}
                      </div>
                      {suggestionRationale && (
                        <p className="text-[11px] text-zinc-500 italic mb-2">
                          {suggestionRationale}
                        </p>
                      )}
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyAll(dealId)}
                          disabled={patch.isPending}
                          className="px-2.5 py-0.5 text-[11px] font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50"
                        >
                          Apply all
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSuggestionFor(null); setSuggestionData(null); }}
                          className="px-2 py-0.5 text-[11px] text-zinc-500 hover:text-zinc-700"
                        >
                          Discard
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {adding ? (
        <div className="p-2 bg-zinc-50 border border-zinc-200 rounded space-y-1.5">
          <input
            autoFocus
            type="text"
            placeholder="Attendees (comma separated)"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
          />
          <textarea
            placeholder="Summary — what was discussed, what changed in the deal"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
          />
          <input
            type="text"
            placeholder="Decisions (one line)"
            value={decisions}
            onChange={(e) => setDecisions(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending}
              className="px-3 py-1 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50"
            >
              Log meeting
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
          className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
        >
          + Log meeting
        </button>
      )}
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
  const remove = useDeleteEntity()
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
              className="flex items-start gap-2 py-1.5 border-b border-zinc-100 last:border-0 group"
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
              <button
                type="button"
                onClick={() => remove.mutate({ entity: 'actions', id: item.id })}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-600 px-1 mt-0.5"
                title="Delete action"
              >
                ×
              </button>
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
  const router = useRouter()
  const { data, isLoading } = useDealDetail(id)
  const patch = usePatchDeal()
  const remove = useDeleteEntity()
  const destroy = useConfirmDestroy()
  const brief = useGenerateBrief()
  const [briefOpen, setBriefOpen] = useState(false)
  const [briefText, setBriefText] = useState('')

  const onPatch = (p: Record<string, unknown>) => patch.mutate({ id, ...p })

  const generateBrief = async () => {
    setBriefOpen(true)
    setBriefText('')
    try {
      const res = await brief.mutateAsync(id)
      setBriefText(res.brief_md)
    } catch (e) {
      setBriefText(`Failed to generate brief: ${(e as Error).message}`)
    }
  }

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
          <DealHeader
            deal={deal}
            onPatch={onPatch}
            onGenerateBrief={generateBrief}
            onDelete={() =>
              destroy.ask({
                title: `Delete ${deal.name}?`,
                body: 'Cascades to its meetings, action items, stakeholders, and bids.',
                typeToConfirm: deal.name,
                run: async () => {
                  await remove.mutateAsync({ entity: 'deals', id })
                  router.push('/')
                },
              })
            }
          />
          <HealthBar dealId={id} />

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
            <StakeholdersSection stakeholders={stakeholders} dealId={id} />
          </Section>

          <Section title="Meetings">
            <MeetingTimeline meetings={meetings} dealId={id} />
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

        <DealAuditSection dealId={id} />
      </div>
      {destroy.element}
      {briefOpen && (
        <BriefModal
          loading={brief.isPending}
          brief={briefText}
          onRegenerate={generateBrief}
          onClose={() => setBriefOpen(false)}
        />
      )}
    </div>
  )
}

function BriefModal({
  loading, brief, onRegenerate, onClose,
}: {
  loading: boolean
  brief: string
  onRegenerate: () => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl border border-zinc-200 w-[700px] max-w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-4 py-2.5 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Meeting prep brief</h2>
            <p className="text-[11px] text-zinc-500">
              Auto-generated from current deal context. Read before walking in.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {!loading && brief && (
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(brief)}
                className="px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-100 rounded"
              >
                Copy
              </button>
            )}
            <button
              type="button"
              onClick={onRegenerate}
              disabled={loading}
              className="px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-100 rounded disabled:opacity-50"
            >
              Regenerate
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 rounded"
            >
              Close
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <p className="text-xs text-zinc-500 text-center py-8">
              Generating... typically 5-15s while the agent reads the full deal context.
            </p>
          )}
          {!loading && brief && (
            <div className="text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap font-mono">
              {brief}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DealAuditSection({ dealId }: { dealId: string }) {
  const [open, setOpen] = useState(false)
  const { data, isFetching } = useDealAudit(open ? dealId : '')

  return (
    <div className="bg-white rounded-lg border border-zinc-200 shadow-sm mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-zinc-50/50 transition-colors"
      >
        <div>
          <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
            Activity log
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Every tool call + dashboard mutation that touched this deal — bot or web, you can see exactly what happened.
          </p>
        </div>
        <span className={`text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="border-t border-zinc-200 max-h-96 overflow-y-auto">
          {isFetching && !data && (
            <p className="text-xs text-zinc-400 text-center py-4">Loading...</p>
          )}
          {data && data.length === 0 && (
            <p className="text-xs text-zinc-400 text-center py-4">
              No tracked activity for this deal yet.
            </p>
          )}
          {data && data.map((row: DealAuditItem) => (
            <AuditRow key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  )
}

function AuditRow({ row }: { row: DealAuditItem }) {
  const sourceColor =
    row.source === 'dashboard' ? 'bg-blue-50 text-blue-700'
    : row.source === 'bot' ? 'bg-violet-50 text-violet-700'
    : 'bg-zinc-100 text-zinc-600'
  const statusColor =
    row.result_status === 'ok' ? 'text-emerald-600'
    : row.result_status === 'error' ? 'text-red-600'
    : 'text-zinc-500'
  return (
    <div className="px-5 py-2 border-b border-zinc-100 last:border-0 text-xs">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${sourceColor}`}>
          {row.source}
        </span>
        <span className="font-mono text-[11px] text-zinc-700">{row.tool_name}</span>
        <span className={`text-[11px] ${statusColor}`}>{row.result_status}</span>
        <span className="text-[10px] text-zinc-400 ml-auto tabular-nums">
          {new Date(row.timestamp).toLocaleString('en-US', {
            month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit',
          })}
        </span>
      </div>
      {row.result_summary && (
        <p className="text-[11px] text-zinc-600 mt-0.5">{row.result_summary}</p>
      )}
    </div>
  )
}
