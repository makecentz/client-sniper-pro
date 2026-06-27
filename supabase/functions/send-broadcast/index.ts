// Admin-only: send a broadcast immediately to a chosen audience.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { renderMarketingEmail, sendViaResend } from "../_shared/email-render.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { broadcastId } = await req.json();
    if (!broadcastId) return json({ error: "broadcastId required" }, 400);

    const { data: bc, error: bcErr } = await supabase.from("email_broadcasts").select("*").eq("id", broadcastId).maybeSingle();
    if (bcErr || !bc) return json({ error: "Broadcast not found" }, 404);
    if (bc.status === "sent") return json({ error: "Already sent" }, 400);

    // Resolve audience -> recipient emails
    let recipients: string[] = [];
    if (bc.audience === "custom" && Array.isArray(bc.custom_emails)) {
      recipients = bc.custom_emails.filter(Boolean);
    } else {
      // pull all users + plan
      const { data: usage } = await supabase.from("usage_tracking").select("user_id, plan");
      const planByUser = new Map<string, string>((usage || []).map((u: any) => [u.user_id, u.plan]));
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name");
      for (const p of profiles || []) {
        const plan = planByUser.get(p.user_id) || "free";
        if (bc.audience === "all" || bc.audience === plan) {
          if (p.display_name && p.display_name.includes("@")) recipients.push(p.display_name);
        }
      }
    }

    // Filter out unsubscribes
    const { data: unsubs } = await supabase.from("marketing_unsubscribes").select("email");
    const unsubSet = new Set((unsubs || []).map((u: any) => u.email.toLowerCase()));
    recipients = Array.from(new Set(recipients.map((e) => e.toLowerCase()))).filter((e) => !unsubSet.has(e));

    let sent = 0, failed = 0;
    for (const to of recipients) {
      const html = renderMarketingEmail({
        recipientEmail: to,
        subject: bc.subject,
        headline: bc.headline,
        body: bc.body,
        ctaLabel: bc.cta_label,
        ctaUrl: bc.cta_url,
        heroImageUrl: bc.hero_image_url,
      });
      const r = await sendViaResend({ to, subject: bc.subject, html });
      if (r.error) {
        failed++;
        await supabase.from("marketing_email_log").insert({
          recipient_email: to, kind: "broadcast", broadcast_id: bc.id, status: "failed", error: r.error,
        });
      } else {
        sent++;
        await supabase.from("marketing_email_log").insert({
          recipient_email: to, kind: "broadcast", broadcast_id: bc.id, status: "sent", resend_message_id: r.id,
        });
      }
      // light throttle
      await new Promise((res) => setTimeout(res, 60));
    }

    await supabase.from("email_broadcasts").update({
      status: "sent", sent_at: new Date().toISOString(), sent_count: sent, failed_count: failed,
    }).eq("id", bc.id);

    return json({ ok: true, sent, failed, recipients: recipients.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
