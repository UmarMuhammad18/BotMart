import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";
import { isDemoOwner } from "@/lib/owners";

/**
 * Auth helpers for BotMart.
 *
 * - Demo agents (owner_id null / "hackathon-user") can be driven by anyone
 * - Agents with an owner can only be controlled by that signed-in user
 *
 * Enable in Supabase Dashboard:
 *   Authentication → Providers → Email → enable Magic Link
 *   Authentication → URL Configuration → Redirect URLs:
 *     http://localhost:3000/auth/callback
 *     https://YOUR_DOMAIN/auth/callback
 */

export async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* Server Component */
          }
        },
      },
    }
  );
}

export async function getSessionUser(): Promise<User | null> {
  try {
    const supabase = await createAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function requireUserId(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.id ?? null;
}

export { isDemoOwner };

/**
 * Demo agents can be driven by anyone. An agent with a real owner can only
 * be controlled by that signed-in owner: being signed out is not a pass.
 */
export async function canControlAgent(agentId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("agents")
    .select("owner_id")
    .eq("id", agentId)
    .single();

  if (!data) return false;
  if (isDemoOwner(data.owner_id)) return true;
  const user = await getSessionUser();
  return !!user && data.owner_id === user.id;
}

export async function assertCanControlAgent(
  agentId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const allowed = await canControlAgent(agentId);
  if (!allowed) {
    return { ok: false, error: "You do not own this agent", status: 403 };
  }
  return { ok: true };
}

/** Agents created without a login (seed data, demo users). */
export const DEMO_OWNER_FILTER = "owner_id.is.null,owner_id.eq.hackathon-user";

/**
 * Vercel cron sends `Authorization: Bearer <CRON_SECRET>`.
 * Fails closed in production when CRON_SECRET is unset; open locally.
 */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
