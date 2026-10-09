"use client";

import { Bot, CheckCircle, XCircle, Clock } from "lucide-react";
import { gbp } from "@/lib/utils";

type Message = {
  from: "buyer" | "seller";
  type: "offer" | "counter" | "accept" | "reject" | "message";
  price?: number;
  message: string;
  timestamp: string;
};

export function StatusBadge({ status }: { status: string }) {
  if (status === "open" || status === "countered")
    return (
      <span className="badge badge-amber">
        <span className="status-dot active" style={{ width: 6, height: 6 }} />
        {status === "countered" ? "Countered" : "In progress"}
      </span>
    );
  if (status === "accepted")
    return (
      <span className="badge badge-emerald">
        <CheckCircle size={11} /> Deal closed
      </span>
    );
  if (status === "rejected")
    return (
      <span className="badge badge-red">
        <XCircle size={11} /> No deal
      </span>
    );
  if (status === "escalated")
    return <span className="badge badge-purple">Escalated</span>;
  return null;
}

export function msgTypeLabel(type: string) {
  const map: Record<string, string> = {
    offer: "Offer",
    counter: "Counter",
    accept: "✓ Accepted",
    reject: "✕ Rejected",
    message: "Message",
  };
  return map[type] ?? type;
}

export function ChatMessage({
  msg,
  buyerName,
  sellerName,
  idx,
}: {
  msg: Message;
  buyerName: string;
  sellerName: string;
  idx: number;
}) {
  const isBuyer = msg.from === "buyer";
  const isTerminal = msg.type === "accept" || msg.type === "reject";

  return (
    <div
      className={`flex msg-enter ${isBuyer ? "justify-start" : "justify-end"}`}
      style={{ animationDelay: `${idx * 0.05}s` }}
    >
      {isBuyer && (
        <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mr-2 mt-1">
          <Bot size={13} className="text-indigo-400" />
        </div>
      )}

      <div className="max-w-[76%] space-y-1">
        <div
          className={`flex items-center gap-2 text-[11px] text-zinc-500 ${
            isBuyer ? "" : "justify-end"
          }`}
        >
          <span className="font-medium text-zinc-400">
            {isBuyer ? buyerName : sellerName}
          </span>
          <span
            className={`font-semibold ${
              msg.type === "accept"
                ? "text-emerald-400"
                : msg.type === "reject"
                  ? "text-red-400"
                  : msg.type === "offer" || msg.type === "counter"
                    ? "text-amber-400"
                    : "text-zinc-600"
            }`}
          >
            {msgTypeLabel(msg.type)}
          </span>
          {msg.price != null && (
            <span className="font-mono font-bold text-white">{gbp(msg.price)}</span>
          )}
        </div>

        <div
          className={`px-4 py-3 text-sm leading-relaxed ${
            isBuyer ? "bubble-buyer" : "bubble-seller"
          } ${isTerminal && msg.type === "accept" ? "bubble-accept" : ""} ${
            isTerminal && msg.type === "reject" ? "bubble-reject" : ""
          }`}
        >
          {msg.message}
        </div>

        <div
          className={`flex items-center gap-1 text-[10px] text-zinc-700 ${
            isBuyer ? "" : "justify-end"
          }`}
        >
          <Clock size={9} />
          {new Date(msg.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      </div>

      {!isBuyer && (
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 ml-2 mt-1">
          <Bot size={13} className="text-emerald-400" />
        </div>
      )}
    </div>
  );
}

export function ThinkingIndicator({ who }: { who: "buyer" | "seller" }) {
  const isBuyer = who === "buyer";
  return (
    <div className={`flex ${isBuyer ? "justify-start" : "justify-end"} animate-fade-in`}>
      {isBuyer && (
        <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mr-2">
          <Bot size={13} className="text-indigo-400" />
        </div>
      )}
      <div className={`px-4 py-3 text-sm ${isBuyer ? "bubble-buyer" : "bubble-seller"}`}>
        <span className="thinking-dots flex gap-1.5">
          <span />
          <span />
          <span />
        </span>
      </div>
      {!isBuyer && (
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 ml-2">
          <Bot size={13} className="text-emerald-400" />
        </div>
      )}
    </div>
  );
}
