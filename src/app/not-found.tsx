import Link from "next/link";
import { ArrowLeft, Boxes } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main id="main" className="flex flex-1 items-center">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-24">
          <p className="font-mono text-sm text-emerald-400">404</p>
          <h1 className="mt-3 text-4xl sm:text-6xl font-semibold tracking-tight text-white max-w-[16ch]">
            No agent is trading at this address.
          </h1>
          <p className="mt-5 max-w-[48ch] text-zinc-400 leading-relaxed">
            The page may have moved, or the link is wrong. The marketplace
            itself is still running.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <Link href="/" className="btn-primary justify-center">
              <ArrowLeft size={16} aria-hidden />
              Back to BotMart
            </Link>
            <Link href="/world" className="btn-secondary justify-center">
              <Boxes size={16} aria-hidden />
              Enter the 3D world
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
