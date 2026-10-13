import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Owner notifications: always stored in the notifications table (the bell in
 * the header), and also emailed when RESEND_API_KEY and NOTIFY_FROM are set.
 */
export type NotificationKind = "approval" | "deal" | "declined" | "court";

export async function notifyOwner(
  supabase: SupabaseClient,
  n: {
    ownerId: string;
    agentId?: string;
    negotiationId?: string;
    kind: NotificationKind;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    /** Link for the email button, relative to the site. */
    href?: string;
  }
) {
  try {
    await supabase.from("notifications").insert({
      owner_id: n.ownerId,
      agent_id: n.agentId ?? null,
      negotiation_id: n.negotiationId ?? null,
      kind: n.kind,
      title: n.title,
      body: n.body,
      data: n.data ?? {},
    });
  } catch {
    // Table not migrated yet: the approval still waits on the negotiate page
  }
  await sendEmail(supabase, n.ownerId, n.title, n.body, n.href);
}

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
  );
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function sendEmail(supabase: SupabaseClient, ownerId: string, subject: string, body: string, href?: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM;
  if (!key || !from) return;
  try {
    const { data } = await supabase.auth.admin.getUserById(ownerId);
    const to = data?.user?.email;
    if (!to) return;
    const link = `${siteUrl()}${href || "/dashboard"}`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject,
        text: `${body}\n\n${link}`,
        html: `<p style="font:15px/1.5 system-ui,sans-serif;color:#142a1c">${escapeHtml(body)}</p><p><a href="${link}" style="display:inline-block;background:#2e7a34;color:#fbfcf7;padding:10px 16px;border-radius:8px;text-decoration:none;font:600 14px system-ui,sans-serif">Open BotMart</a></p>`,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error("[notify] email failed", err);
  }
}
