"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "xs" | "sm" | "md";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950 shadow-sm border border-transparent",
  secondary:
    "bg-white text-zinc-700 border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 shadow-sm",
  ghost:
    "bg-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent",
  danger:
    "bg-red-600 text-white hover:bg-red-700 border border-transparent shadow-sm",
  soft:
    "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-transparent",
};

const SIZE: Record<Size, string> = {
  xs: "h-7 px-2 text-[11px] gap-1 rounded",
  sm: "h-8 px-2.5 text-xs gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-xs gap-1.5 rounded-md",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "sm", loading, disabled, className = "", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center font-medium",
        "transition-all duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "focus-visible:outline-none",
        VARIANT[variant],
        SIZE[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {loading && (
        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
});
