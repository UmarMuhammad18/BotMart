"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Note = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  negotiation_id: string | null;
  read_at: string | null;
  created_at: string;
  actionable?: boolean;
};

const POLL_MS = 30_000;

/**
 * Header bell for signed-in owners: deal approvals (approve / decline right
 * here), finished deals and court rulings. Polls every 30s while visible.
 */
export function NotificationBell() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotes(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {
      // offline: keep what we have
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function answer(note: Note, decision: "approve" | "decline") {
    if (!note.negotiation_id) return;
    setBusy(note.id);
    setError(null);
    try {
      const res = await fetch(`/api/negotiations/${note.negotiation_id}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Couldn't answer that request");
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    await load();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="btn-ghost relative min-w-[44px] justify-center px-3"
      >
        <Bell size={16} aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 min-w-[16px] rounded-full bg-terracotta px-1 text-[10px] font-semibold leading-4 text-paper" aria-hidden>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(360px,calc(100vw-24px))] rounded-xl border border-ink/10 bg-surface-1 p-2 shadow-[var(--shadow-lift)]"
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={() => void markAllRead()} className="text-xs text-emerald-700 hover:underline min-h-[32px]">
                Mark all read
              </button>
            )}
          </div>
          {error && <p className="mx-2 mb-2 rounded-lg bg-terracotta/10 px-3 py-2 text-xs text-terracotta">{error}</p>}
          {notes.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-zinc-600">
              Nothing yet. When your agent finds a deal, it&apos;ll ask you here.
            </p>
          ) : (
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
              {notes.map((n) => (
                <li key={n.id} className={`rounded-lg px-3 py-2.5 ${n.read_at ? "" : "bg-emerald-500/[0.07]"}`}>
                  <p className="text-sm font-medium leading-snug text-ink">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">{n.body}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {n.actionable && (
                      <>
                        <button
                          type="button"
                          disabled={busy === n.id}
                          onClick={() => void answer(n, "approve")}
                          className="btn-primary min-h-[36px] px-3 text-xs"
                        >
                          <Check size={13} aria-hidden /> Approve
                        </button>
                        <button
                          type="button"
                          disabled={busy === n.id}
                          onClick={() => void answer(n, "decline")}
                          className="btn-secondary min-h-[36px] px-3 text-xs"
                        >
                          <X size={13} aria-hidden /> Decline
                        </button>
                      </>
                    )}
                    {n.negotiation_id && (
                      <Link href={`/negotiate?id=${n.negotiation_id}`} className="text-xs text-emerald-700 hover:underline" onClick={() => setOpen(false)}>
                        View
                      </Link>
                    )}
                    <span className="ml-auto text-[11px] text-zinc-500">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
