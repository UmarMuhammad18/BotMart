"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, Volume2, VolumeX } from "lucide-react";
import type { QualitySetting, QualityTier, SkyMode, Weather, WorldSettings } from "@/lib/world/options";

const SKY: { v: SkyMode; label: string }[] = [
  { v: "theme", label: "Match site theme" },
  { v: "realtime", label: "Your local time" },
  { v: "day", label: "Day" },
  { v: "dusk", label: "Golden hour" },
  { v: "night", label: "Night" },
];
const WEATHER: { v: Weather; label: string }[] = [
  { v: "clear", label: "Clear" },
  { v: "rain", label: "Rain" },
  { v: "mist", label: "Mist" },
];
const QUALITY: { v: QualitySetting; label: string }[] = [
  { v: "auto", label: "Auto" },
  { v: "high", label: "High" },
  { v: "medium", label: "Medium" },
  { v: "low", label: "Low" },
];

function Group<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { v: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="py-1.5">
      <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">{label}</p>
      <div className="flex flex-wrap gap-1 px-1">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={value === o.v}
            onClick={() => onChange(o.v)}
            className={`min-h-[34px] rounded-lg px-2.5 text-xs transition ${
              value === o.v ? "bg-emerald-500/15 font-medium text-emerald-800" : "text-zinc-700 hover:bg-ink/[0.05]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Scene settings for the village: sky, weather, graphics quality, sound. */
export function WorldSettingsMenu({
  settings,
  onChange,
  detected,
}: {
  settings: WorldSettings;
  onChange: (s: WorldSettings) => void;
  detected: QualityTier;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    <div ref={ref} className="relative flex gap-2">
      <button
        type="button"
        onClick={() => onChange({ ...settings, sound: !settings.sound })}
        aria-pressed={settings.sound}
        className="btn-secondary text-sm"
        title={settings.sound ? "Mute the village" : "Turn on village sound"}
      >
        {settings.sound ? <Volume2 size={14} aria-hidden /> : <VolumeX size={14} aria-hidden />}
        <span className="sr-only sm:not-sr-only">{settings.sound ? "Sound on" : "Sound off"}</span>
      </button>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="btn-secondary text-sm"
      >
        <SlidersHorizontal size={14} aria-hidden /> Scene
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Scene settings"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-72 rounded-xl border border-ink/10 bg-surface-1 p-1.5 shadow-[var(--shadow-lift)]"
        >
          <Group label="Sky" options={SKY} value={settings.sky} onChange={(sky) => onChange({ ...settings, sky })} />
          <Group label="Weather" options={WEATHER} value={settings.weather} onChange={(weather) => onChange({ ...settings, weather })} />
          <Group label="Graphics" options={QUALITY} value={settings.quality} onChange={(quality) => onChange({ ...settings, quality })} />
          <p className="px-2 pb-1.5 text-[11px] leading-snug text-zinc-600">
            Auto picked <span className="font-medium text-zinc-800">{detected}</span> for this device. Robot detail
            changes apply after a reload.
          </p>
        </div>
      )}
    </div>
  );
}
