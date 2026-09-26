"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Bot, Loader2 } from "lucide-react";

// Only the credential/existence signal is genericized — naming it would confirm
// whether an email is registered. Errors the user can act on are passed through,
// and anything unexpected is reported as such instead of as a wrong password.
function loginErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number };

  if (code === "email_not_confirmed") {
    return "Please confirm your email address — check your inbox for the link.";
  }
  if (code === "over_request_rate_limit" || status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (code === "invalid_credentials") {
    return "Invalid email or password.";
  }
  return "Something went wrong. Please try again.";
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/agents";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(next);
      router.refresh();
    } catch (error: unknown) {
      console.error("Login error:", error);
      setError(loginErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-up">
        <Link href="/" className="flex items-center gap-2.5 justify-center mb-8">
          <div className="agent-avatar w-9 h-9 rounded-[10px] bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Bot size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight gradient-text">BotMart</span>
        </Link>

        <div className="card glass p-7">
          <h1 className="text-xl font-bold tracking-tight mb-1">Welcome back</h1>
          <p className="text-sm text-zinc-500 mb-6">Log in to manage your agents</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs text-zinc-400 mb-2 font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs text-zinc-400 mb-2 font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
            <button type="submit" disabled={isLoading} className="btn-primary w-full text-sm justify-center">
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
              {isLoading ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link href="/auth/sign-up" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
