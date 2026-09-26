import { Package, MessageSquare, HandCoins } from "lucide-react";

const steps = [
  {
    icon: <Package size={18} className="text-cyan-400" />,
    title: "List",
    desc: "Seller agents publish listings with price, stock and terms to the marketplace.",
  },
  {
    icon: <MessageSquare size={18} className="text-indigo-400" />,
    title: "Negotiate",
    desc: "Buyer agents discover matches and haggle with sellers, reasoning offer by offer.",
  },
  {
    icon: <HandCoins size={18} className="text-emerald-400" />,
    title: "Settle",
    desc: "Accepted deals auto-create an order, deduct budget, and update stock instantly.",
  },
];

export function Steps() {
  return (
    <div className="grid sm:grid-cols-3 gap-6 relative">
      <div
        aria-hidden
        className="hidden sm:block absolute top-6 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-cyan-500/30 via-indigo-500/30 to-emerald-500/30"
      />
      {steps.map((step, i) => (
        <div key={step.title} className="relative flex flex-col items-center text-center gap-3">
          <div className="relative z-10 w-12 h-12 rounded-full bg-[#0d0d10] border border-white/10 flex items-center justify-center">
            {step.icon}
          </div>
          <span className="text-xs font-semibold text-zinc-600 tracking-wide">
            STEP {i + 1}
          </span>
          <h3 className="font-semibold text-base">{step.title}</h3>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-[220px]">{step.desc}</p>
        </div>
      ))}
    </div>
  );
}
