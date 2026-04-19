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
    <div className={`text-center py-12 px-6 ${className}`}>
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 mb-3">
        <Icon size={20} className="text-zinc-400" strokeWidth={1.6} />
      </div>
      <p className="text-sm font-medium text-zinc-700 mb-1">{title}</p>
      {description && (
        <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
