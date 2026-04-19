"use client";

import { useState } from "react";
import { Library, Plus } from "lucide-react";
import {
  useProposals,
  useCreateProposal,
  useDeleteEntity,
  PROPOSAL_SECTION_TYPES,
} from "@/lib/api";
import { useConfirmDestroy } from "@/components/confirm-destroy";

const SECTION_LABELS: Record<string, string> = {
  intro: "Intro",
  scope: "Scope",
  pricing: "Pricing",
  warranty: "Warranty",
  schedule: "Schedule",
  compliance: "Compliance",
  qa: "Q&A",
  bio: "Bio / experience",
  other: "Other",
};

const SECTION_BADGES: Record<string, string> = {
  intro: "bg-blue-50 text-blue-700",
  scope: "bg-violet-50 text-violet-700",
  pricing: "bg-emerald-50 text-emerald-700",
  warranty: "bg-amber-50 text-amber-700",
  schedule: "bg-indigo-50 text-indigo-700",
  compliance: "bg-red-50 text-red-700",
  qa: "bg-cyan-50 text-cyan-700",
  bio: "bg-pink-50 text-pink-700",
  other: "bg-slate-100 text-slate-600",
};

export default function ProposalsPage() {
  const [sectionType, setSectionType] = useState<string>("");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [stype, setStype] = useState("scope");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  const { data, isLoading } = useProposals({
    section_type: sectionType || undefined,
    q: query || undefined,
  });
  const create = useCreateProposal();
  const remove = useDeleteEntity();
  const destroy = useConfirmDestroy();
  const proposals = data ?? [];

  const submit = async () => {
    if (!title.trim() || !content.trim()) return;
    await create.mutateAsync({ title, section_type: stype, content, tags });
    setTitle(""); setStype("scope"); setContent(""); setTags("");
    setAdding(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-zinc-800">Proposal library</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5 hidden sm:block">
              Reusable sections from past wins. Copy/paste into new proposals — speeds writing 5×.
            </p>
          </div>
          {!adding && (
            <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 shrink-0">
              <Plus size={12} />
              New
            </button>
          )}
        </div>

        <div className="flex items-center gap-0.5 bg-white border border-zinc-200 rounded-lg p-0.5 mb-2 w-fit overflow-x-auto max-w-full">
          <button type="button" onClick={() => setSectionType("")} className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap ${sectionType === "" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"}`}>All</button>
          {PROPOSAL_SECTION_TYPES.map((s) => (
            <button key={s} type="button" onClick={() => setSectionType(s)} className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap ${sectionType === s ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"}`}>
              {SECTION_LABELS[s]}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by title, content, or tag..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full mb-3 px-3 py-2 text-xs border border-zinc-200 rounded bg-white focus:outline-none focus:border-zinc-400"
        />

        {adding && (
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-3 mb-3 space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-zinc-700">New precedent</span>
              <button type="button" onClick={() => setAdding(false)} className="text-[11px] text-zinc-400 hover:text-zinc-600">Cancel</button>
            </div>
            <input autoFocus type="text" placeholder="Title (e.g. DCS migration scope template)" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
            <div className="grid grid-cols-2 gap-1.5">
              <select value={stype} onChange={(e) => setStype(e.target.value)} className="px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400">
                {PROPOSAL_SECTION_TYPES.map((s) => <option key={s} value={s}>{SECTION_LABELS[s]}</option>)}
              </select>
              <input type="text" placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} className="px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" />
            </div>
            <textarea
              placeholder="Content — paste the section text. Markdown OK."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-2 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 font-mono"
            />
            <button type="button" onClick={submit} disabled={create.isPending || !title.trim() || !content.trim()} className="w-full py-2 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50">
              {create.isPending ? "Saving..." : "Save precedent"}
            </button>
          </div>
        )}

        {isLoading ? (
          <p className="text-xs text-zinc-400 text-center py-8">Loading...</p>
        ) : proposals.length === 0 ? (
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm py-12 text-center">
            <Library size={20} className="inline text-zinc-300 mb-2" />
            <p className="text-xs text-zinc-400">
              {query || sectionType ? "No precedents match this filter." : "No precedents yet. Build your library by saving sections from past wins."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {proposals.map((p) => (
              <div key={p.id} className="bg-white rounded-lg border border-zinc-200 shadow-sm p-3 group relative">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${SECTION_BADGES[p.section_type] ?? SECTION_BADGES.other}`}>
                      {SECTION_LABELS[p.section_type] ?? p.section_type}
                    </span>
                    <h3 className="text-sm font-medium text-zinc-800 truncate">{p.title}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(p.content)}
                      className="opacity-0 group-hover:opacity-100 text-[11px] px-2 py-0.5 text-zinc-700 hover:bg-zinc-100 rounded"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => destroy.ask({
                        title: `Delete "${p.title}"?`,
                        run: () => remove.mutateAsync({ entity: "proposals", id: p.id }),
                      })}
                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 px-1"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap line-clamp-6">{p.content}</p>
                {p.tags && (
                  <p className="text-[11px] text-zinc-500 mt-1.5">{p.tags}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {destroy.element}
    </div>
  );
}
