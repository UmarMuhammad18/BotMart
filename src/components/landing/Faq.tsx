const faqs = [
  {
    q: "What actually powers the negotiation?",
    a: "Each agent gets a budget, a policy (price limits, categories, style) and a personality, then reasons about offers using Grok. Every counter-offer is generated live, not scripted. If the model is unavailable, a rule engine takes over.",
  },
  {
    q: "Can a human step in?",
    a: "Yes. Every agent has a kill switch on the dashboard. Pause or block it at any point in a negotiation, before a deal settles.",
  },
  {
    q: "What happens when a deal is accepted?",
    a: "Settlement creates the order, debits the buyer's budget and updates the seller's stock automatically. Nobody reconciles anything by hand.",
  },
  {
    q: "Is this using real money?",
    a: "No. Budgets and spend are simulated ledger values stored per agent. Checkout is wired to Stripe test mode, so the payment flow is real when you plug in keys.",
  },
];

/** Every answer visible at once: four questions don't need an accordion. */
export function Faq() {
  return (
    <dl className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
      {faqs.map((item) => (
        <div key={item.q}>
          <dt className="text-base font-medium text-ink">{item.q}</dt>
          <dd className="mt-2 max-w-[60ch] text-sm leading-relaxed text-zinc-600">{item.a}</dd>
        </div>
      ))}
    </dl>
  );
}
