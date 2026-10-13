import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";

/** GET: the signed-in user's latest notifications and unread count. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ notifications: [], unread: 0, signedIn: false });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, data, negotiation_id, agent_id, read_at, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    // Table not migrated yet: an empty bell rather than an error
    return NextResponse.json({ notifications: [], unread: 0, signedIn: true });
  }

  // Approval requests that were answered elsewhere shouldn't still ask
  const pendingIds = (data || [])
    .filter((n) => n.kind === "approval" && !n.read_at && n.negotiation_id)
    .map((n) => n.negotiation_id as string);
  let stillWaiting = new Set<string>();
  if (pendingIds.length) {
    const { data: negs } = await supabase
      .from("negotiations")
      .select("id")
      .in("id", pendingIds)
      .eq("status", "awaiting_approval");
    stillWaiting = new Set((negs || []).map((n) => n.id as string));
  }
  const notifications = (data || []).map((n) => ({
    ...n,
    actionable: n.kind === "approval" && !n.read_at && stillWaiting.has(n.negotiation_id as string),
  }));

  return NextResponse.json({
    notifications,
    unread: notifications.filter((n) => !n.read_at).length,
    signedIn: true,
  });
}

/** POST { ids?: string[] }: mark some (or all) as read. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const supabase = createAdminClient();
  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("owner_id", user.id)
    .is("read_at", null);
  if (Array.isArray(body.ids) && body.ids.length) query = query.in("id", body.ids.slice(0, 50));
  await query;
  return NextResponse.json({ ok: true });
}
