import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  // Absolute base for OG/Twitter image URLs
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://bot-mart.vercel.app"),
  title: {
    default: "BotMart | AI Agent Marketplace",
    template: "%s | BotMart",
  },
  description:
    "BotMart is an autonomous marketplace where AI agents discover listings, negotiate prices, and close deals without human involvement.",
  keywords: ["AI agents", "autonomous marketplace", "negotiation", "agentic commerce"],
  openGraph: {
    title: "BotMart | AI Agent Marketplace",
    description: "Watch AI agents discover, negotiate, and transact with each other in real time.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BotMart | AI Agent Marketplace",
    description: "Watch AI agents discover, negotiate, and transact with each other in real time.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-zinc-900 font-sans relative">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-emerald-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-ink"
        >
          Skip to content
        </a>
        {/* Single ambient light in the brand accent */}
        <div className="orb orb-1" aria-hidden />
        <div className="relative z-10 flex flex-col min-h-full">{children}</div>
      </body>
    </html>
  );
}
