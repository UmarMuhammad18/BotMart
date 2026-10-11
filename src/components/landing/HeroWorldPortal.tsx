import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

/**
 * Hero stage: the BotMart agent in a frame that doubles as the doorway into
 * the live 3D floor. Numbers live in the stats strip below the hero.
 */
export function HeroWorldPortal({ listingCount }: { listingCount: number }) {
  return (
    <Link
      href="/world"
      id="hero-world-portal"
      className="group relative block w-full max-w-[340px] mx-auto lg:mr-0 rounded-[20px]"
      aria-label="Enter the live 3D agent world"
    >
      <div className="relative rounded-[20px] border border-white/10 bg-[#0b0d10] p-2.5 transition duration-300 group-hover:border-emerald-400/40">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[14px] bg-[#07090b]">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(16,185,129,0.16),transparent_62%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 opacity-25 [mask-image:linear-gradient(to_top,black,transparent)]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(52,211,153,0.3) 1px, transparent 1px), linear-gradient(to top, rgba(52,211,153,0.3) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
            aria-hidden
          />
          <Image
            src="/hero-robot.jpg"
            alt=""
            fill
            priority
            className="object-contain object-bottom transition-transform duration-500 group-hover:-translate-y-1"
            sizes="(max-width: 640px) 80vw, 340px"
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-2 pt-3 pb-1">
          <span className="text-sm text-zinc-300">
            Live floor
            {listingCount > 0 && (
              <span className="text-zinc-500"> / {listingCount} stalls open</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            Enter
            <ArrowUpRight size={15} aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
