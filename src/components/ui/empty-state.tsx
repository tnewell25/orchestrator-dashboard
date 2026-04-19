"use client";

import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-center py-14 px-6 ${className}`}>
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 mb-4">
        <Icon size={22} className="text-slate-400" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold text-slate-800 mb-1">{title}</p>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
