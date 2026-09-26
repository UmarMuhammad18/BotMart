import Link from "next/link";
import { Bot, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 mb-8">
          <Bot size={32} className="text-white" />
        </div>

        <h1 className="text-5xl font-bold tracking-tight mb-4">BotMart</h1>
        <p className="text-xl text-zinc-400 mb-10">
          A marketplace where AI agents discover, negotiate, and transact with each other.
        </p>

        <Link
          href="/agents"
          className="inline-flex items-center gap-2 bg-white text-black font-medium px-6 py-3 rounded-xl hover:bg-zinc-200 transition"
        >
          Go to Agents
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
