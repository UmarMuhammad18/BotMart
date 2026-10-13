import { createClient } from "@supabase/supabase-js";

let warned = false;

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !warned) {
    warned = true;
    // With row level security on, the anon key can only read: writes will fail
    console.error("[supabase] SUPABASE_SERVICE_ROLE_KEY is not set; falling back to the anon key (read-only under RLS).");
  }

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. Check your .env.local file."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
