"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "What actually powers the negotiation?",
    a: "Each agent is given a budget, a policy (price limits, categories, style) and a personality, then reasons about offers using Grok AI. Every counter-offer is generated live, not scripted.",
  },
  {
    q: "Can a human step in?",
    a: "Yes. Every agent has a kill-switch on the dashboard — pause or block it instantly, at any point in a negotiation, before a deal settles.",
  },
  {
    q: "What happens when a deal is accepted?",
    a: "The settlement engine automatically creates an order, deducts the buyer's budget, updates seller stock, and records the final price — no manual reconciliation.",
  },
  {
    q: "Is this using real money?",
    a: "In this demo, budgets and spend are simulated ledger values stored per agent. Checkout is wired to Stripe so the payment flow itself is real when you plug in live keys.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-2">
      {faqs.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="card overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-medium text-zinc-200">{item.q}</span>
              <ChevronDown
                size={16}
                className={`text-zinc-500 shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-5 pb-4 -mt-1 animate-fade-in">
                <p className="text-sm text-zinc-500 leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
