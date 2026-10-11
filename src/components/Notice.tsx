"use client";

import { CheckCircle2, AlertCircle, X } from "lucide-react";

export type NoticeState = { tone: "success" | "error"; text: string } | null;

/**
 * Inline, dismissible feedback that replaces window.alert(). Errors are
 * announced assertively (role="alert"), confirmations politely.
 */
export function Notice({
  notice,
  onDismiss,
  className = "",
}: {
  notice: NoticeState;
  onDismiss: () => void;
  className?: string;
}) {
  if (!notice) return null;
  const error = notice.tone === "error";
  const Icon = error ? AlertCircle : CheckCircle2;

  return (
    <div
      role={error ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        error
          ? "border-rose-400/30 bg-rose-500/[0.08] text-rose-100"
          : "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-100"
      } ${className}`}
    >
      <Icon
        size={16}
        className={`mt-0.5 shrink-0 ${error ? "text-rose-300" : "text-emerald-300"}`}
        aria-hidden
      />
      <p className="flex-1">{notice.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-my-2 -mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white"
      >
        <X size={15} aria-hidden />
      </button>
    </div>
  );
}
