"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bot, Zap, LogIn, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/agents", label: "Agents" },
  { href: "/listings", label: "Marketplace" },
  { href: "/negotiate", label: "Negotiate" },
  { href: "/dashboard", label: "Dashboard" },
];

type SessionUser = { id: string; email?: string | null } | null;

export function AppHeader({ active }: { active?: string }) {
  const pathname = usePathname();
  const currentPath = active ?? pathname;
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

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

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#050507]/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="agent-avatar w-8 h-8 rounded-[10px] bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Bot size={16} className="text-white" />
          </div>
          <span className="font-bold text-base tracking-tight gradient-text">
            BotMart
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/70 border border-emerald-500/20 rounded-full px-2 py-0.5 bg-emerald-500/5">
            <Zap size={8} className="fill-emerald-400" />
            Live
          </span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Main navigation">
          {links.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
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
            <span className="text-xs text-zinc-600 px-2">…</span>
          ) : user ? (
            <>
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-zinc-400 max-w-[160px] truncate">
                <User size={12} />
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="btn-ghost text-xs px-2.5 py-1.5"
                title="Sign out"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-secondary text-xs px-3 py-1.5">
              <LogIn size={13} />
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
