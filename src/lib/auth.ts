import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Auth helpers for BotMart.
 *
 * Phase 1 (current): optional — if no session, APIs still work with admin client
 * for local/dev demos.
 * Phase 2: enforce ownership once Supabase Auth is enabled in the dashboard.
 *
 * Enable in Supabase:
 *   Authentication → Providers → Email (magic link)
 * Then set NEXT_PUBLIC_SUPABASE_URL + keys as usual.
 */

export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  } catch {
    return null;
  }
}

/**
 * Returns true if the user owns the agent, or if there is no auth session
 * (dev/demo mode allows everything).
 */
export async function canControlAgent(agentId: string): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return true; // demo mode

  const admin = createAdminClient();
  const { data } = await admin
    .from("agents")
    .select("owner_id")
    .eq("id", agentId)
    .single();

  if (!data) return false;
  if (!data.owner_id) return true; // unclaimed agent
  return data.owner_id === user.id;
}

export async function requireUserId(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.id ?? null;
}
