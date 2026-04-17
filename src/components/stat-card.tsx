"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  trend?: {
    value: string;
    direction: "up" | "down";
  };
}

export function StatCard({ label, value, trend }: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 min-w-0">
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide truncate">
        {label}
      </p>
      <div className="flex items-end gap-2 mt-1">
        <p className="text-xl font-semibold text-slate-900 leading-none">
          {value}
        </p>
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-[11px] font-medium leading-none pb-0.5 ${
              trend.direction === "up" ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {trend.direction === "up" ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
