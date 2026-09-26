"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bot, Loader2 } from "lucide-react";

// Supabase does not reveal whether an email is already registered, so the
// fallback stays generic. Validation failures describe the user's own input and
// are not an enumeration oracle, so surface them.
function signUpErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number };

  if (code === "weak_password") {
    return "Please choose a stronger password.";
  }
  if (code === "email_address_invalid") {
    return "Please use a real email address — example and test domains are not supported.";
  }
  if (code === "email_address_not_authorized") {
    return "We cannot send confirmation email to that address. Please use a different one.";
  }
  if (code === "validation_failed") {
    return "Please check the details you entered.";
  }
  if (code === "over_email_send_rate_limit" || status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return "Unable to complete sign-up. Please try again.";
}

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      console.error("Sign-up error:", error);
      setError(signUpErrorMessage(error));
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
          <h1 className="text-xl font-bold tracking-tight mb-1">Create your account</h1>
          <p className="text-sm text-zinc-500 mb-6">Start deploying autonomous agents</p>

          <form onSubmit={handleSignUp} className="space-y-4">
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="repeat-password" className="block text-xs text-zinc-400 mb-2 font-medium">
                Repeat password
              </label>
              <input
                id="repeat-password"
                type="password"
                required
                autoComplete="new-password"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
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
              {isLoading ? "Creating account…" : "Sign up"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
