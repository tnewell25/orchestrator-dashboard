"use client";

import { type ReactNode } from "react";

export function PageHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-base font-semibold text-zinc-900 tracking-tight">
            {title}
          </h1>
          {meta}
        </div>
        {description && (
          <p className="text-[11px] text-zinc-500 mt-0.5 max-w-xl hidden sm:block">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-1.5 shrink-0">{actions}</div>
      )}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2 mb-2">
      <div>
        <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
          {title}
        </h2>
        {description && (
          <p className="text-[11px] text-zinc-500 mt-0.5">{description}</p>
        )}
      </div>
      {actions}
    </div>
  );
}
