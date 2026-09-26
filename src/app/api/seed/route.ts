import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { seedDemo } from "@/lib/seed";

export async function POST() {
  try {
    const supabase = createAdminClient();
    const data = await seedDemo(supabase);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
