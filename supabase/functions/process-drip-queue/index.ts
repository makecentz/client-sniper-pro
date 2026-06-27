// Cron-triggered: send the next due email in the 4-step trial drip for each enrolled, non-pro user.
// Schedule (steps): 0 -> immediately, 1 -> +1d, 3 -> +3d, 7 -> +7d (offsets from signup).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { renderMarketingEmail, sendViaResend } from "../_shared/email-render.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DRIP_SLUGS = ["drip_day_0", "drip_day_1", "drip_day_3", "drip_day_7"];
const DRIP_DELAYS_DAYS = [0, 1, 3, 7];
const MAX_PER_RUN = 50;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const now = new Date().toISOString();

    // Find due drip recipients (enabled, current_step < 4, next_send_at <= now)
    const { data: due, error } = await supabase
      .from("email_campaign_state")
      .select("user_id,email,current_step,next_send_at")
      .eq("enabled", true)
      .lt("current_step", 4)
      .lte("next_send_at", now)
      .limit(MAX_PER_RUN);

    if (error) throw error;
    if (!due || due.length === 0) return json({ processed: 0 });

    // Load templates
    const { data: tpls } = await supabase.from("email_templates").select("*").in("slug", DRIP_SLUGS);
    const tplBySlug = new Map<string, any>((tpls || []).map((t: any) => [t.slug, t]));

    // Skip pro users (defensive)
    const userIds = due.map((d) => d.user_id);
    const { data: usage } = await supabase.from("usage_tracking").select("user_id,plan").in("user_id", userIds);
    const proSet = new Set((usage || []).filter((u: any) => u.plan === "pro").map((u: any) => u.user_id));

    // Skip unsubscribed
    const { data: unsubs } = await supabase.from("marketing_unsubscribes").select("email");
    const unsubSet = new Set((unsubs || []).map((u: any) => u.email.toLowerCase()));

    let processed = 0;
    for (const row of due) {
      const slug = DRIP_SLUGS[row.current_step];
      const tpl = tplBySlug.get(slug);
      if (!tpl || !tpl.enabled) {
        await advance(supabase, row);
        continue;
      }
      if (proSet.has(row.user_id)) {
        await supabase.from("email_campaign_state").update({
          enabled: false, stopped_reason: "pro_upgrade",
        }).eq("user_id", row.user_id);
        continue;
      }
      if (unsubSet.has((row.email || "").toLowerCase())) {
        await supabase.from("email_campaign_state").update({
          enabled: false, stopped_reason: "unsubscribed", unsubscribed_at: new Date().toISOString(),
        }).eq("user_id", row.user_id);
        continue;
      }

      const html = renderMarketingEmail({
        recipientEmail: row.email,
        subject: tpl.subject,
        headline: tpl.headline,
        body: tpl.body,
        ctaLabel: tpl.cta_label,
        ctaUrl: tpl.cta_url,
        heroImageUrl: tpl.hero_image_url,
      });

      const r = await sendViaResend({ to: row.email, subject: tpl.subject, html });
      if (r.error) {
        await supabase.from("marketing_email_log").insert({
          user_id: row.user_id, recipient_email: row.email, kind: "drip", template_slug: slug, status: "failed", error: r.error,
        });
        // retry in 1 hour
        await supabase.from("email_campaign_state").update({
          next_send_at: new Date(Date.now() + 3600_000).toISOString(),
        }).eq("user_id", row.user_id);
      } else {
        await supabase.from("marketing_email_log").insert({
          user_id: row.user_id, recipient_email: row.email, kind: "drip", template_slug: slug,
          status: "sent", resend_message_id: r.id,
        });
        await advance(supabase, row);
      }
      processed++;
    }

    return json({ processed });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

async function advance(supabase: any, row: { user_id: string; current_step: number }) {
  const nextStep = row.current_step + 1;
  if (nextStep >= 4) {
    await supabase.from("email_campaign_state").update({
      current_step: 4, last_sent_at: new Date().toISOString(),
      enabled: false, stopped_reason: "completed", next_send_at: null,
    }).eq("user_id", row.user_id);
  } else {
    const delayDays = DRIP_DELAYS_DAYS[nextStep] - DRIP_DELAYS_DAYS[row.current_step];
    const next = new Date(Date.now() + delayDays * 86400_000).toISOString();
    await supabase.from("email_campaign_state").update({
      current_step: nextStep, last_sent_at: new Date().toISOString(), next_send_at: next,
    }).eq("user_id", row.user_id);
  }
}

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
