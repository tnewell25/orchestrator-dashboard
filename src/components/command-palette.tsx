"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  Factory,
  FileText,
  LayoutDashboard,
  Search,
  ShieldCheck,
  TrendingUp,
  User,
} from "lucide-react";
import { useSearch, type SearchResult } from "@/lib/api";

const KIND_META: Record<string, { icon: typeof User; label: string; color: string }> = {
  deal: { icon: Briefcase, label: "Deal", color: "text-blue-600" },
  contact: { icon: User, label: "Contact", color: "text-zinc-600" },
  company: { icon: Building2, label: "Company", color: "text-violet-600" },
  bid: { icon: FileText, label: "Bid", color: "text-amber-600" },
  plant: { icon: Factory, label: "Plant", color: "text-emerald-600" },
};

type Action = {
  id: string;
  title: string;
  subtitle?: string;
  icon: typeof Search;
  href?: string;
  run?: () => void;
};

const STATIC_ACTIONS: Action[] = [
  { id: "go-pipeline", title: "Go to Pipeline", icon: LayoutDashboard, href: "/" },
  { id: "go-forecast", title: "Go to Forecast", icon: TrendingUp, href: "/forecast" },
  { id: "go-bids", title: "Go to Bids", icon: FileText, href: "/bids" },
  { id: "go-companies", title: "Go to Companies", icon: Building2, href: "/companies" },
  { id: "go-plants", title: "Go to Plants", icon: Factory, href: "/plants" },
  { id: "go-contacts", title: "Go to Contacts", icon: User, href: "/contacts" },
  { id: "go-activity", title: "Go to Inbox / Activity", icon: Search, href: "/activity" },
  { id: "go-specs", title: "Go to Specs library", icon: ShieldCheck, href: "/specs" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Cmd/Ctrl + K to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const trimmed = query.trim();
  const { data: searchResults, isFetching } = useSearch(trimmed);

  // Filter static actions by query, then merge with search results
  const actions: Action[] = useMemo(() => {
    if (!trimmed) return STATIC_ACTIONS;
    const q = trimmed.toLowerCase();
    const staticMatches: Action[] = STATIC_ACTIONS.filter((a) =>
      a.title.toLowerCase().includes(q),
    );
    const searchMatches: Action[] = (searchResults ?? []).map((r: SearchResult) => {
      const meta = KIND_META[r.kind] ?? KIND_META.deal;
      return {
        id: `${r.kind}-${r.id}`,
        title: r.title,
        subtitle: `${meta.label} · ${r.subtitle}`,
        icon: meta.icon,
        href: r.href,
      };
    });
    return [...searchMatches, ...staticMatches];
  }, [trimmed, searchResults]);

  // Keep highlight in range
  useEffect(() => {
    if (highlight >= actions.length) setHighlight(0);
  }, [actions.length, highlight]);

  const select = (a: Action) => {
    setOpen(false);
    if (a.href) router.push(a.href);
    if (a.run) a.run();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white rounded-lg shadow-2xl border border-zinc-200 w-[560px] max-w-[92vw] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 border-b border-zinc-200">
          <Search size={14} className="text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Search deals, contacts, companies, bids... or type a command"
            onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, actions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const a = actions[highlight];
                if (a) select(a);
              }
            }}
            className="flex-1 py-3 text-sm bg-transparent focus:outline-none placeholder:text-zinc-400"
          />
          {isFetching && (
            <span className="text-[10px] text-zinc-400">searching...</span>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {actions.length === 0 && (
            <p className="text-xs text-zinc-500 text-center py-6">
              No matches. Press Esc to close.
            </p>
          )}
          {actions.map((a, i) => {
            const Icon = a.icon;
            const isHighlighted = i === highlight;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => select(a)}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-xs ${
                  isHighlighted ? "bg-zinc-100" : "hover:bg-zinc-50"
                }`}
              >
                <Icon size={14} className="text-zinc-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-zinc-800 font-medium truncate">{a.title}</p>
                  {a.subtitle && (
                    <p className="text-[11px] text-zinc-500 truncate">{a.subtitle}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-3 py-1.5 border-t border-zinc-200 bg-zinc-50/60 flex items-center gap-3 text-[10px] text-zinc-400">
          <span><kbd className="px-1 py-0.5 bg-white border border-zinc-200 rounded text-[10px]">↑↓</kbd> nav</span>
          <span><kbd className="px-1 py-0.5 bg-white border border-zinc-200 rounded text-[10px]">↵</kbd> open</span>
          <span><kbd className="px-1 py-0.5 bg-white border border-zinc-200 rounded text-[10px]">Esc</kbd> close</span>
          <span className="ml-auto">⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}
