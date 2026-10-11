"use client";

import { useMemo } from "react";
import { duelGeometry, headAt, type DuelPoint } from "@/lib/landing/duel";
import type { NegotiationMessage } from "@/lib/types";

export type DuelData = {
  key: string;
  listingTitle: string;
  askPrice: number;
  buyerName: string;
  sellerName: string;
  messages: NegotiationMessage[];
};

const W = 600;
const H = 400;
const BOX = { width: W, height: H, padX: 56, padTop: 54, padBottom: 44 };
const BUYER = "#c3ec7c"; // spring-lime: the offer climbing
const SELLER = "#5fe0a0"; // mint: the ask falling

const money = (n: number) => `£${Math.round(n)}`;

/** Smooth step between two points: flat out of each move, eased between. */
function segmentPath(a: DuelPoint, b: DuelPoint) {
  const mx = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
}

/**
 * The price duel: the seller's asking price falls, the buyer's offer rises,
 * and on a deal both lines meet. `revealed` is the last message drawn.
 */
export function PriceDuel({
  duel,
  revealed,
  live = false,
}: {
  duel: DuelData;
  revealed: number;
  live?: boolean;
}) {
  const g = useMemo(() => duelGeometry(duel.messages, duel.askPrice, BOX), [duel]);
  const step = Math.min(revealed, g.lastStep);
  const buyerHead = headAt(g.buyer, step);
  const sellerHead = headAt(g.seller, step);
  const dealt = g.deal && step >= g.deal.step ? g.deal : null;
  const finished = step >= g.lastStep;
  const walked = finished && !g.deal;
  const current = duel.messages[step];
  const gap = buyerHead && sellerHead && !dealt ? sellerHead.price - buyerHead.price : null;
  const gapX = Math.max(buyerHead?.x ?? 0, sellerHead?.x ?? 0) + 18;

  const status = dealt ? "Deal" : walked ? "No deal" : live ? "Live" : `Round ${step + 1}`;
  const speaker = current ? (current.from === "buyer" ? duel.buyerName : duel.sellerName) : "";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-white">{duel.listingTitle}</p>
          <p className="mt-0.5 truncate text-sm text-zinc-500">
            <span style={{ color: BUYER }}>{duel.buyerName}</span>
            <span className="text-zinc-600"> buys from </span>
            <span style={{ color: SELLER }}>{duel.sellerName}</span>
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium tabular-nums ${
            dealt
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
              : walked
                ? "border-white/10 text-zinc-400"
                : "border-white/10 text-zinc-300"
          }`}
        >
          {live && !finished && <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 align-middle" />}
          {status}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full flex-1"
        role="img"
        aria-label={
          dealt
            ? `${duel.buyerName} and ${duel.sellerName} met at ${money(dealt.price)} for ${duel.listingTitle}, down from an asking price of ${money(duel.askPrice)}.`
            : `${duel.sellerName} is asking ${money(sellerHead?.price ?? duel.askPrice)}; ${duel.buyerName} is offering ${money(buyerHead?.price ?? 0)}.`
        }
      >
        <defs>
          {/* userSpaceOnUse: a flat segment has a zero-height bbox, which would
              collapse a bbox-relative filter region and hide the line */}
          <filter id="duel-glow" filterUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="duel-burst">
            <stop offset="0%" stopColor="#d1fae2" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#42d886" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#42d886" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Price grid */}
        {g.ticks.map((t) => (
          <g key={t.price}>
            <line x1={BOX.padX} x2={W - BOX.padX + 12} y1={t.y} y2={t.y} stroke="rgba(190,235,205,0.07)" />
            <text x={BOX.padX - 12} y={t.y + 4} textAnchor="end" className="fill-zinc-600 font-mono text-[12px]">
              {money(t.price)}
            </text>
          </g>
        ))}

        {/* Asking price reference */}
        <line
          x1={BOX.padX}
          x2={W - BOX.padX + 12}
          y1={g.seller[0].y}
          y2={g.seller[0].y}
          stroke={SELLER}
          strokeOpacity="0.25"
          strokeDasharray="3 6"
        />
        <text x={W - BOX.padX + 12} y={g.seller[0].y - 8} textAnchor="end" className="font-mono text-[12px]" fill={SELLER} fillOpacity="0.7">
          asking {money(duel.askPrice)}
        </text>

        {/* The two lines, one segment per move */}
        {(["seller", "buyer"] as const).map((side) => {
          const pts = side === "buyer" ? g.buyer : g.seller;
          const color = side === "buyer" ? BUYER : SELLER;
          return pts.slice(1).map((p, i) =>
            p.step <= step ? (
              <path
                key={`${duel.key}-${side}-${i}`}
                d={segmentPath(pts[i], p)}
                fill="none"
                stroke={color}
                strokeWidth={3}
                strokeLinecap="round"
                pathLength={1}
                className="duel-draw"
                filter="url(#duel-glow)"
              />
            ) : null
          );
        })}

        {/* Gap between the two sides */}
        {gap != null && gap > 0 && buyerHead && sellerHead && (
          <g key={`${duel.key}-gap-${step}`} className="duel-fade">
            <line x1={gapX} x2={gapX} y1={sellerHead.y + 6} y2={buyerHead.y - 6} stroke="rgba(238,246,240,0.35)" strokeDasharray="2 4" />
            <text x={gapX + 10} y={(sellerHead.y + buyerHead.y) / 2 + 4} className="fill-zinc-300 text-[13px] font-medium">
              {money(gap)} apart
            </text>
          </g>
        )}

        {/* Heads: current price on each side */}
        {!dealt &&
          [sellerHead, buyerHead].map((h) =>
            h ? (
              <g key={`${duel.key}-head-${h.side}-${h.step}`} className="duel-fade">
                <circle cx={h.x} cy={h.y} r={6} fill={h.side === "buyer" ? BUYER : SELLER} />
                <circle cx={h.x} cy={h.y} r={13} fill="none" stroke={h.side === "buyer" ? BUYER : SELLER} strokeOpacity="0.35" className="duel-ping" />
                <text
                  // Near the y-axis, sit to the right of the point so the tick labels stay clear
                  x={h.x < BOX.padX + 60 ? h.x + 18 : h.x}
                  y={h.side === "seller" ? h.y - 16 : h.y + 30}
                  textAnchor={h.x < BOX.padX + 60 ? "start" : h.x > W - 140 ? "end" : "middle"}
                  className="font-semibold tabular-nums text-[22px]"
                  fill={h.side === "buyer" ? BUYER : SELLER}
                >
                  {money(h.price)}
                </text>
              </g>
            ) : null
          )}

        {/* The handshake */}
        {dealt && (
          <g key={`${duel.key}-deal`} className="duel-after-draw">
            <circle cx={dealt.x} cy={dealt.y} r={70} fill="url(#duel-burst)" className="duel-burst" />
            <circle cx={dealt.x} cy={dealt.y} r={9} fill="#eafff1" filter="url(#duel-glow)" />
            <circle cx={dealt.x} cy={dealt.y} r={24} fill="none" stroke="#74e9a5" strokeWidth={2} className="duel-ring" />
            <text x={dealt.x - 20} y={dealt.y - 34} textAnchor="end" className="duel-fade fill-white text-[44px] font-semibold tabular-nums tracking-tight">
              {money(dealt.price)}
            </text>
            <text x={dealt.x - 20} y={dealt.y - 84} textAnchor="end" className="duel-fade fill-emerald-300 text-[13px] font-semibold tracking-[0.2em]">
              DEAL
            </text>
          </g>
        )}
      </svg>

      <p aria-live="polite" className="min-h-[3.5rem] px-5 pb-5 text-sm leading-snug text-zinc-300 sm:px-6 sm:pb-6">
        {current && (
          <span key={`${duel.key}-${step}`} className="duel-fade block">
            <span className="font-medium" style={{ color: current.from === "buyer" ? BUYER : SELLER }}>
              {speaker}:
            </span>{" "}
            {current.message}
          </span>
        )}
      </p>
    </div>
  );
}
