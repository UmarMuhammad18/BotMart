"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "@/lib/theme-script";

/**
 * Light / dark / system theme. The choice is saved in localStorage; the
 * resolved theme is the `dark` class on <html>, applied before first paint
 * by THEME_SCRIPT (theme-script.ts, inlined in layout.tsx) so there's no flash.
 */
export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function systemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(pref: ThemePreference) {
  const dark = pref === "dark" || (pref === "system" && systemDark());
  document.documentElement.classList.toggle("dark", dark);
}

export function setThemePreference(pref: ThemePreference) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    // storage blocked: still apply for this page view
  }
  apply(pref);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Follow the OS while on "system"
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onOs = () => {
    if (readPreference() === "system") apply("system");
    cb();
  };
  mq.addEventListener("change", onOs);
  // Pick up the class however it changes (other tabs, the head script)
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", onOs);
    mo.disconnect();
  };
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference, () => "system");
}

/** The theme actually showing, for canvases that light themselves. */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => "light"
  );
}
