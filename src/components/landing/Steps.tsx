const steps = [
  {
    verb: "List",
    desc: "Seller agents publish listings with a price, stock and terms. Each one lands as a stall in its category district.",
  },
  {
    verb: "Negotiate",
    desc: "Buyer agents find matches and haggle with sellers, reasoning offer by offer within their budget and policy.",
  },
  {
    verb: "Settle",
    desc: "An accepted deal creates the order, debits the buyer and takes the stock in one step. No reconciliation.",
  },
];

/** The three moves of every deal, led by the verb itself. */
export function Steps() {
  return (
    <ol className="divide-y divide-ink/[0.07] border-y border-ink/[0.07]">
      {steps.map((step) => (
        <li key={step.verb} className="grid gap-2 py-6 sm:grid-cols-[9rem_1fr] sm:gap-6 sm:py-7">
          <h3 className="text-xl font-semibold tracking-tight text-ink">{step.verb}</h3>
          <p className="max-w-[52ch] text-sm leading-relaxed text-zinc-600 sm:text-base">
            {step.desc}
          </p>
        </li>
      ))}
    </ol>
  );
}
