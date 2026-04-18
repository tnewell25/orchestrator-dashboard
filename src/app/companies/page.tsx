"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { useCompaniesList, useCreateCompany } from "@/lib/api";

export default function CompaniesPage() {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");

  const { data, isLoading } = useCompaniesList(query);
  const create = useCreateCompany();
  const companies = data ?? [];

  const submit = async () => {
    if (!name.trim()) return;
    await create.mutateAsync({
      name: name.trim(),
      industry: industry.trim(),
      website: website.trim(),
    });
    setName(""); setIndustry(""); setWebsite("");
    setAdding(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-sm font-semibold text-zinc-800">Companies</h1>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-400 tabular-nums">
              {companies.length} {companies.length === 1 ? "company" : "companies"}
            </span>
            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800"
              >
                <Plus size={12} />
                New company
              </button>
            )}
          </div>
        </div>

        {adding && (
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-3 mb-3 space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-zinc-700">New company</span>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="text-[11px] text-zinc-400 hover:text-zinc-600"
              >
                Cancel
              </button>
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Company name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                placeholder="Industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              />
              <input
                type="text"
                placeholder="website.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
              />
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending || !name.trim()}
              className="w-full py-1 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 disabled:opacity-50"
            >
              {create.isPending ? "Creating..." : "Create company"}
            </button>
          </div>
        )}

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search companies..."
          className="w-full mb-3 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 focus:border-zinc-300"
        />

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-8 text-center">
              <p className="text-xs text-zinc-400">Loading...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-zinc-400">
                {query ? "No companies match." : "No companies yet."}
              </p>
            </div>
          ) : (
            companies.map((co) => (
              <Link
                key={co.id}
                href={`/companies/${co.id}`}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
              >
                <div className="w-7 h-7 bg-zinc-100 rounded flex items-center justify-center shrink-0">
                  <Building2 size={14} className="text-zinc-500" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-800 truncate">
                    {co.name}
                  </p>
                  {co.industry && (
                    <p className="text-[11px] text-zinc-500 truncate">{co.industry}</p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
