"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { setThemePreference, useThemePreference, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; hint: string; Icon: typeof Sun }[] = [
  { value: "system", label: "System", hint: "Match your device", Icon: Monitor },
  { value: "light", label: "Light", hint: "The village by day", Icon: Sun },
  { value: "dark", label: "Dark", hint: "The village at night", Icon: Moon },
];

/** Header menu: System / Light / Dark. */
export function ThemeMenu() {
  const pref = useThemePreference();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((o) => o.value === pref) ?? OPTIONS[0];

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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}`}
        className="btn-ghost min-w-[44px] justify-center px-3"
      >
        <current.Icon size={16} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Theme"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-56 rounded-xl border border-ink/10 bg-surface-1 p-1.5 shadow-[var(--shadow-lift)]"
        >
          {OPTIONS.map(({ value, label, hint, Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={pref === value}
              onClick={() => {
                setThemePreference(value);
                setOpen(false);
              }}
              className="flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 text-left text-sm text-zinc-800 hover:bg-ink/[0.05]"
            >
              <Icon size={16} className="text-zinc-600" aria-hidden />
              <span className="flex-1">
                <span className="block font-medium text-ink">{label}</span>
                <span className="block text-xs text-zinc-600">{hint}</span>
              </span>
              {pref === value && <Check size={15} className="text-emerald-700" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Compact three-way control for the mobile menu. */
export function ThemeSegmented() {
  const pref = useThemePreference();
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-xl border border-ink/10 p-1">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === value}
          onClick={() => setThemePreference(value)}
          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-sm ${
            pref === value ? "bg-ink/[0.08] text-ink font-medium" : "text-zinc-600 hover:text-ink"
          }`}
        >
          <Icon size={14} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
