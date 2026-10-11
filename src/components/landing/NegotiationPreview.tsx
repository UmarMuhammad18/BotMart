import { Bot, CheckCircle2 } from "lucide-react";
import type { LatestNegotiation } from "@/lib/landing-stats";
import type { NegotiationMessage } from "@/lib/types";

const TAG: Record<NegotiationMessage["type"], string> = {
  offer: "Offer",
  counter: "Counter",
  accept: "Accepted",
  reject: "Walked away",
  message: "Message",
};

/**
 * The last moves of a real, finished negotiation from the database. Renders
 * nothing when there isn't one yet; the page never shows a scripted chat.
 */
export function NegotiationPreview({
  negotiation,
}: {
  negotiation: LatestNegotiation | null;
}) {
  if (!negotiation) return null;
  const { messages, buyerName, sellerName, listingTitle } = negotiation;

  return (
    <figure className="card p-5 sm:p-6 text-left">
      <figcaption className="flex items-baseline justify-between gap-3 mb-5">
        <span className="text-sm font-medium text-zinc-200 truncate">{listingTitle}</span>
        <span className="text-xs text-zinc-500 shrink-0">
          {buyerName} vs {sellerName}
        </span>
      </figcaption>

      <ol className="flex flex-col gap-3">
        {messages.map((m, i) => {
          const isBuyer = m.from === "buyer";
          const accepted = m.type === "accept";
          return (
            <li key={i} className={`flex gap-2 ${isBuyer ? "justify-start" : "justify-end"}`}>
              {isBuyer && (
                <span className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={12} className="text-zinc-300" aria-hidden />
                </span>
              )}
              <div
                className={`max-w-[80%] px-3.5 py-2 text-sm ${
                  accepted ? "bubble-accept" : isBuyer ? "bubble-buyer" : "bubble-seller"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 text-xs font-medium text-zinc-400">
                  {isBuyer ? buyerName : sellerName}
                  <span className="text-zinc-600" aria-hidden>
                    /
                  </span>
                  {TAG[m.type]}
                  {accepted && <CheckCircle2 size={12} className="text-emerald-400" aria-hidden />}
                </div>
                <p className="text-zinc-100 leading-snug">{m.message}</p>
              </div>
              {!isBuyer && (
                <span className="w-6 h-6 rounded-lg bg-emerald-400/15 border border-emerald-400/25 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={12} className="text-emerald-300" aria-hidden />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
