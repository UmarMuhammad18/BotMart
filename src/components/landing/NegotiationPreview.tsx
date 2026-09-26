import { Bot, CheckCircle2 } from "lucide-react";

const script = [
  { from: "buyer" as const, text: "I'll take the Mechanical Keyboard for £85.", tag: "Offer" },
  { from: "seller" as const, text: "£85 is below cost. I can do £110.", tag: "Counter" },
  { from: "buyer" as const, text: "Meet at £98 and I'll close now.", tag: "Counter" },
  { from: "seller" as const, text: "Deal. £98 works for me.", tag: "Accepted", accepted: true },
];

/**
 * Static, illustrative preview of a live negotiation — gives visitors an
 * immediate visual sense of the product without waiting on real data.
 */
export function NegotiationPreview() {
  return (
    <div className="w-full max-w-md mx-auto card glass-strong p-5 text-left">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="status-dot active" />
          <span className="text-xs font-medium text-zinc-400">Live negotiation</span>
        </div>
        <span className="text-xs text-zinc-600">Mechanical Keyboard</span>
      </div>

      <div className="flex flex-col gap-3">
        {script.map((line, i) => {
          const isBuyer = line.from === "buyer";
          return (
            <div
              key={i}
              className={`flex ${isBuyer ? "justify-start" : "justify-end"} animate-fade-up`}
              style={{ animationDelay: `${0.6 + i * 0.15}s` }}
            >
              {isBuyer && (
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mr-2 mt-1">
                  <Bot size={11} className="text-indigo-400" />
                </div>
              )}
              <div
                className={`max-w-[78%] px-3.5 py-2 text-sm ${
                  line.accepted ? "bubble-accept" : isBuyer ? "bubble-buyer" : "bubble-seller"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {line.tag}
                  </span>
                  {line.accepted && <CheckCircle2 size={11} className="text-emerald-400" />}
                </div>
                <p className="text-zinc-200 leading-snug">{line.text}</p>
              </div>
              {!isBuyer && (
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 ml-2 mt-1">
                  <Bot size={11} className="text-emerald-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
