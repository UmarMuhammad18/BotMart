import Link from "next/link";
import { Bot, AlertTriangle } from "lucide-react";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  // `error` comes from the URL, so it is attacker-controlled. Render it only
  // when it looks like a Supabase error code, never as free text someone can
  // choose — otherwise this card will happily display their phishing copy.
  const code = params?.error;
  const isErrorCode = typeof code === "string" && /^[a-z0-9_]{1,64}$/.test(code);

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-up">
        <Link href="/" className="flex items-center gap-2.5 justify-center mb-8">
          <div className="agent-avatar w-9 h-9 rounded-[10px] bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Bot size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight gradient-text">BotMart</span>
        </Link>

        <div className="card glass p-7 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight mb-2">Something went wrong</h1>
          <p className="text-sm text-zinc-500">
            {isErrorCode ? `Code error: ${code}` : "An unspecified error occurred."}
          </p>
          <Link href="/auth/login" className="btn-secondary w-full text-sm justify-center mt-6">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
