"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Zap } from "lucide-react";

const links = [
  { href: "/agents",    label: "Agents" },
  { href: "/listings",  label: "Marketplace" },
  { href: "/negotiate", label: "Negotiate" },
  { href: "/dashboard", label: "Dashboard" },
];

export function AppHeader({ active }: { active?: string }) {
  const pathname = usePathname();
  const currentPath = active ?? pathname;

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#050507]/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="agent-avatar w-8 h-8 rounded-[10px] bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Bot size={16} className="text-white" />
          </div>
          <span className="font-bold text-base tracking-tight gradient-text">BotMart</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/70 border border-emerald-500/20 rounded-full px-2 py-0.5 bg-emerald-500/5">
            <Zap size={8} className="fill-emerald-400" />
            Live
          </span>
        </Link>

        {/* Nav */}
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
      </div>
    </header>
  );
}
