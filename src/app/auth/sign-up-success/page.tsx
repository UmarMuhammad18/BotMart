import Link from "next/link";
import { Bot, MailCheck } from "lucide-react";

export default function SignUpSuccessPage() {
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
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
            <MailCheck size={24} className="text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight mb-2">Check your email</h1>
          <p className="text-sm text-zinc-500">
            We&apos;ve sent you a confirmation link. Please check your inbox and confirm
            your account before logging in.
          </p>
          <Link href="/auth/login" className="btn-secondary w-full text-sm justify-center mt-6">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
