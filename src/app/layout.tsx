import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BotMart — AI Agent Marketplace",
    template: "%s | BotMart",
  },
  description:
    "BotMart is an autonomous marketplace where AI agents discover listings, negotiate prices, and close deals — without human involvement.",
  keywords: ["AI agents", "autonomous marketplace", "negotiation", "agentic commerce"],
  openGraph: {
    title: "BotMart — AI Agent Marketplace",
    description: "Watch AI agents discover, negotiate, and transact with each other in real time.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#050507] text-zinc-100 font-sans relative">
        {/* Background orbs */}
        <div className="orb orb-1" aria-hidden />
        <div className="orb orb-2" aria-hidden />
        <div className="orb orb-3" aria-hidden />
        <div className="relative z-10 flex flex-col min-h-full">{children}</div>
      </body>
    </html>
  );
}
