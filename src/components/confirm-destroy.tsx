"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  // Open imperatively or via prop. Imperative mode: use the hook below.
  open: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  title: string;
  body?: string;
  confirmLabel?: string;
  // Optional: require typing the entity name to enable the confirm button.
  // Use for destructive ops where mistakes cost more than a click (deal,
  // company). Skip for cheap items (action, meeting).
  typeToConfirm?: string;
  busy?: boolean;
};

export function ConfirmDestroy({
  open,
  onConfirm,
  onCancel,
  title,
  body,
  confirmLabel = "Delete",
  typeToConfirm,
  busy,
}: Props) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setTyped("");
    } else if (typeToConfirm) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, typeToConfirm]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const canConfirm =
    !busy && (!typeToConfirm || typed.trim() === typeToConfirm.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl border border-zinc-200 w-[400px] max-w-[90vw] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-zinc-900 mb-1">{title}</h2>
        {body && (
          <p className="text-xs text-zinc-600 leading-relaxed mb-3">{body}</p>
        )}

        {typeToConfirm && (
          <div className="mb-3">
            <label className="text-[11px] text-zinc-500 block mb-1">
              Type <span className="font-mono text-zinc-700">{typeToConfirm}</span> to confirm
            </label>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-zinc-300 rounded focus:outline-none focus:border-zinc-500"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm()}
            disabled={!canConfirm}
            className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Convenience hook — most callers just want a one-liner.
//
// const destroy = useConfirmDestroy()
// destroy.ask({ title: "Delete deal?", body: "...", typeToConfirm: deal.name,
//               run: async () => { await mutation.mutateAsync(...) } })
//
// Returns the modal element to render, plus an `ask` function.
export function useConfirmDestroy() {
  const [state, setState] = useState<
    | null
    | {
        title: string;
        body?: string;
        confirmLabel?: string;
        typeToConfirm?: string;
        run: () => Promise<unknown> | unknown;
      }
  >(null);
  const [busy, setBusy] = useState(false);

  const ask = (cfg: NonNullable<typeof state>) => setState(cfg);
  const cancel = () => {
    if (busy) return;
    setState(null);
  };
  const confirm = async () => {
    if (!state) return;
    setBusy(true);
    try {
      await state.run();
      setState(null);
    } finally {
      setBusy(false);
    }
  };

  const element = (
    <ConfirmDestroy
      open={!!state}
      title={state?.title ?? ""}
      body={state?.body}
      confirmLabel={state?.confirmLabel}
      typeToConfirm={state?.typeToConfirm}
      busy={busy}
      onConfirm={confirm}
      onCancel={cancel}
    />
  );

  return { ask, element };
}
