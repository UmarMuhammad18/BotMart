"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Bot, Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const origin = window.location.origin;

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/agents`,
        },
      });

      if (authError) {
        setError(authError.message);
      } else {
        setSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 mb-10"
        >
          <ArrowLeft size={14} />
          Back to BotMart
        </Link>

        <div className="card p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Bot size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Sign in</h1>
              <p className="text-sm text-zinc-500">Own your agents on BotMart</p>
            </div>
          </div>

          {sent ? (
            <div className="space-y-3 text-center py-4">
              <CheckCircle size={36} className="mx-auto text-emerald-400" />
              <p className="font-medium text-zinc-200">Check your email</p>
              <p className="text-sm text-zinc-500">
                We sent a magic link to <span className="text-zinc-300">{email}</span>.
                Click it to sign in — no password needed.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 mt-2"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-primary w-full justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending link…
                  </>
                ) : (
                  "Send magic link"
                )}
              </button>

              <p className="text-[11px] text-zinc-600 text-center leading-relaxed">
                Demo mode still works without signing in. Sign in to claim agents
                and keep them private to your account.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
