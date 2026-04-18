'use client'

import { useState } from 'react'
import {
  useContacts,
  usePatchContact,
  useCreateContact,
  type Contact,
} from '@/lib/api'

function formatDate(date: string | null) {
  if (!date) return '--'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function ContactRow({
  contact, isExpanded, onToggle,
}: {
  contact: Contact
  isExpanded: boolean
  onToggle: () => void
}) {
  const patch = usePatchContact()
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesDraft, setNotesDraft] = useState(contact.personal_notes ?? '')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(contact.title ?? '')

  const saveNotes = async () => {
    if (notesDraft !== contact.personal_notes) {
      await patch.mutateAsync({ id: contact.id, personal_notes: notesDraft })
    }
    setEditingNotes(false)
  }
  const saveTitle = async () => {
    if (titleDraft !== contact.title) {
      await patch.mutateAsync({ id: contact.id, title: titleDraft })
    }
    setEditingTitle(false)
  }

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
          {contact.title && !isExpanded && (
            <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
              {contact.title}
            </p>
          )}
        </div>
        <div className="hidden sm:block shrink-0 w-48">
          {contact.email && (
            <span className="text-[11px] text-zinc-500 truncate block">
              {contact.email}
            </span>
          )}
        </div>
        <div className="shrink-0 w-20 text-right">
          <span className="text-[11px] text-zinc-400 tabular-nums">
            {formatDate(contact.last_touch)}
          </span>
        </div>
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
      </button>

      {hasNotes && !isExpanded && (
        <div className="px-4 pb-2 -mt-1">
          <p className="text-[11px] text-zinc-400 line-clamp-1">{preview}</p>
        </div>
      )}

      {isExpanded && (
        <div className="px-4 pb-3 -mt-0.5 space-y-2">
          {/* Title (editable) */}
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wide block mb-0.5">
              Title
            </span>
            {editingTitle ? (
              <input
                autoFocus
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle()
                  if (e.key === 'Escape') { setTitleDraft(contact.title ?? ''); setEditingTitle(false) }
                }}
                className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              />
            ) : (
              <span
                onClick={() => setEditingTitle(true)}
                className={`text-xs cursor-text hover:bg-zinc-100 rounded px-1 -mx-1 ${contact.title ? 'text-zinc-700' : 'text-zinc-400 italic'}`}
              >
                {contact.title || 'Add title'}
              </span>
            )}
          </div>

          {/* Personal notes (editable) */}
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wide block mb-0.5">
              Personal notes
            </span>
            {editingNotes ? (
              <textarea
                autoFocus
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                onBlur={saveNotes}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setNotesDraft(contact.personal_notes ?? ''); setEditingNotes(false) }
                }}
                rows={4}
                placeholder="Kids, hobbies, recent conversations..."
                className="w-full px-2 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              />
            ) : (
              <div
                onClick={() => setEditingNotes(true)}
                className={`bg-zinc-50 rounded px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap cursor-text hover:bg-zinc-100/80 transition-colors ${contact.personal_notes ? 'text-zinc-600' : 'text-zinc-400 italic'}`}
              >
                {contact.personal_notes || 'Click to add personal notes — kids, hobbies, conversation hooks'}
              </div>
            )}
          </div>

          {contact.phone && (
            <p className="text-[11px] text-zinc-400">{contact.phone}</p>
          )}
        </div>
      )}
    </div>
  )
}

function NewContactForm({ onClose }: { onClose: () => void }) {
  const create = useCreateContact()
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  const submit = async () => {
    if (!name.trim()) return
    await create.mutateAsync({
      name: name.trim(),
      title: title.trim(),
      email: email.trim(),
      phone: phone.trim(),
      personal_notes: notes.trim(),
    })
    onClose()
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-3 mb-3 space-y-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-zinc-700">New contact</span>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-zinc-400 hover:text-zinc-600"
        >
          Cancel
        </button>
      </div>
      <input
        autoFocus
        type="text"
        placeholder="Name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
      />
      <div className="grid grid-cols-2 gap-1.5">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
        />
      </div>
      <input
        type="tel"
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
      />
      <textarea
        placeholder="Personal notes — kids, hobbies, anything you want to remember"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
      />
      <button
        type="button"
        onClick={submit}
        disabled={create.isPending || !name.trim()}
        className="w-full py-1 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50"
      >
        {create.isPending ? 'Creating...' : 'Create contact'}
      </button>
    </div>
  )
}

export default function ContactsPage() {
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const { data, isLoading } = useContacts(query)
  const contacts: Contact[] = data ?? []

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-sm font-semibold text-zinc-800">Contacts</h1>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-400 tabular-nums">
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
            </span>
            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="px-2.5 py-1 text-[11px] font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800"
              >
                + New contact
              </button>
            )}
          </div>
        </div>

        {adding && <NewContactForm onClose={() => setAdding(false)} />}

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

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
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
