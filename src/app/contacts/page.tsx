'use client'

import { useState } from 'react'
import { useContacts } from '@/lib/api'
import type { Contact } from '@/lib/api'

function formatDate(date: string | null) {
  if (!date) return '--'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function ContactRow({
  contact,
  isExpanded,
  onToggle,
}: {
  contact: Contact
  isExpanded: boolean
  onToggle: () => void
}) {
  const hasNotes = !!contact.personal_notes?.trim()
  const preview =
    hasNotes && contact.personal_notes.length > 100
      ? contact.personal_notes.slice(0, 100) + '...'
      : contact.personal_notes

  return (
    <div className="border-b border-zinc-100 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-2.5 hover:bg-zinc-50/80 transition-colors flex items-start gap-4"
      >
        {/* Name + title */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-800 truncate">
              {contact.name}
            </span>
            {contact.company && (
              <span className="text-[11px] text-zinc-400 truncate shrink-0">
                {contact.company}
              </span>
            )}
          </div>
          {contact.title && (
            <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
              {contact.title}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="hidden sm:block shrink-0 w-48">
          {contact.email && (
            <span className="text-[11px] text-zinc-500 truncate block">
              {contact.email}
            </span>
          )}
        </div>

        {/* Last touch */}
        <div className="shrink-0 w-20 text-right">
          <span className="text-[11px] text-zinc-400 tabular-nums">
            {formatDate(contact.last_touch)}
          </span>
        </div>

        {/* Expand indicator */}
        {hasNotes && (
          <svg
            className={`w-3 h-3 text-zinc-300 shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M1.646 4.646a.5.5 0 01.708 0L8 10.293l5.646-5.647a.5.5 0 01.708.708l-6 6a.5.5 0 01-.708 0l-6-6a.5.5 0 010-.708z"
            />
          </svg>
        )}
      </button>

      {/* Notes preview / expanded */}
      {hasNotes && !isExpanded && (
        <div className="px-4 pb-2 -mt-1">
          <p className="text-[11px] text-zinc-400 pl-0 line-clamp-1">
            {preview}
          </p>
        </div>
      )}

      {hasNotes && isExpanded && (
        <div className="px-4 pb-3 -mt-0.5">
          <div className="bg-zinc-50 rounded px-3 py-2 text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap">
            {contact.personal_notes}
          </div>
          {contact.phone && (
            <p className="text-[11px] text-zinc-400 mt-1.5">
              {contact.phone}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function ContactsPage() {
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useContacts(query)
  const contacts: Contact[] = data ?? []

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-sm font-semibold text-zinc-800">Contacts</h1>
          <span className="text-[11px] text-zinc-400 tabular-nums">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85zm-5.242.156a5 5 0 110-10 5 5 0 010 10z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-8 pr-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300 transition-colors"
          />
        </div>

        {/* Contact list */}
        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-4 px-4 py-2 border-b border-zinc-200 text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
            <div className="flex-1">Name</div>
            <div className="hidden sm:block w-48">Email</div>
            <div className="w-20 text-right">Last Touch</div>
            <div className="w-3" />
          </div>

          {isLoading ? (
            <div className="py-8 text-center">
              <p className="text-xs text-zinc-400">Loading...</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-zinc-400">
                {query ? 'No contacts match your search.' : 'No contacts yet.'}
              </p>
            </div>
          ) : (
            contacts.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                isExpanded={expandedId === contact.id}
                onToggle={() =>
                  setExpandedId(
                    expandedId === contact.id ? null : contact.id
                  )
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
