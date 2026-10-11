"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bot, LogIn, LogOut, User, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/agents", label: "Agents" },
  { href: "/listings", label: "Marketplace" },
  { href: "/negotiate", label: "Negotiate" },
  { href: "/world", label: "World" },
  { href: "/court", label: "Court" },
  { href: "/dashboard", label: "Dashboard" },
];

type SessionUser = { id: string; email?: string | null } | null;

export function AppHeader({ active }: { active?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentPath = active ?? pathname;
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (mounted) setUser(data.user ?? null);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(
        session?.user
          ? { id: session.user.id, email: session.user.email }
          : null
      );
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Escape closes the mobile menu
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#050507]/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-8 h-8 rounded-[10px] bg-emerald-400 flex items-center justify-center">
            <Bot size={17} className="text-[#04130c]" aria-hidden />
          </span>
          <span className="font-semibold text-[15px] tracking-tight text-white">
            BotMart
          </span>
        </Link>

        <nav
          className="hidden md:flex items-center gap-0.5 lg:gap-1"
          aria-label="Main navigation"
        >
          {links.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative inline-flex min-h-[44px] items-center px-2 lg:px-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "text-white"
                    : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-lg bg-white/[0.08] border border-white/[0.10]"
                  />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {loading ? (
            <span className="skeleton h-8 w-20" aria-hidden />
          ) : user ? (
            <>
              <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-zinc-400 max-w-[140px] truncate">
                <User size={12} />
                {user.email}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="btn-ghost text-xs px-2.5 py-1.5"
                title="Sign out"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="btn-secondary text-xs px-3 py-1.5 hidden sm:inline-flex"
            >
              <LogIn size={13} />
              Sign in
            </Link>
          )}

          <button
            type="button"
            className="md:hidden btn-ghost min-w-[44px] justify-center p-2"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main navigation"
          className="md:hidden border-t border-white/[0.06] bg-[#050507]/95 backdrop-blur-xl px-4 py-3 space-y-1"
        >
          {links.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`flex min-h-[44px] items-center px-3 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-white/[0.08] text-white"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {!user && (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center gap-2 px-3 rounded-lg text-sm text-emerald-400"
            >
              <LogIn size={14} />
              Sign in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
