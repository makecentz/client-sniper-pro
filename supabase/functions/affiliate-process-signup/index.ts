// Records a referral when a new user signs up with a referral code.
// Attribution rules:
//  - Last-click wins (cookie already overwritten on each new click).
//  - Click must be within attribution window (default 30 days).
//  - Reject self-referrals.
//  - Reject if referrer and referred share a recent click IP (basic fraud).
//  - One referral per referred user (DB unique constraint).
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const referralCode: string | undefined = body.referralCode;
    const clickedAt: number | undefined = body.clickedAt;
    if (!referralCode || typeof referralCode !== "string") {
      return json({ error: "referralCode required" }, 400);
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);

    // Look up affiliate
    const { data: link } = await admin
      .from("affiliate_links")
      .select("user_id")
      .eq("referral_code", referralCode)
      .maybeSingle();
    if (!link) return json({ error: "Invalid code" }, 404);

    // Anti-fraud: self-referral
    if (link.user_id === user.id) {
      return json({ error: "Cannot refer yourself", reason: "self_referral" }, 400);
    }

    // Attribution window
    const { data: settings } = await admin
      .from("admin_settings").select("key, value")
      .in("key", ["affiliate_attribution_window_days"]);
    const windowDays = parseInt(
      settings?.find((s: any) => s.key === "affiliate_attribution_window_days")?.value ?? "30",
      10
    );

    if (clickedAt && Number.isFinite(clickedAt)) {
      const ageDays = (Date.now() - clickedAt) / (1000 * 60 * 60 * 24);
      if (ageDays > windowDays) {
        return json({ error: "Referral expired", reason: "out_of_window" }, 400);
      }
    }

    // Anti-fraud: IP collision between affiliate's recent clicks and signup IP
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
      || req.headers.get("cf-connecting-ip") || "";
    if (ip) {
      const ipHash = await sha256(ip + "|" + serviceKey);
      const { data: ownClicks } = await admin
        .from("affiliate_clicks")
        .select("id")
        .eq("affiliate_user_id", link.user_id)
        .eq("ip_hash", ipHash)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1);
      // If the affiliate themselves clicked from this same IP recently, treat as fraud
      // (Self-clicking to game referrals from the same network)
      if (ownClicks && ownClicks.length > 0) {
        // Allow referral but flag — we still record but mark for admin review
        // Simplest: reject to keep books clean.
        return json({ error: "Fraud check failed", reason: "ip_collision" }, 400);
      }
    }

    // Insert referral (unique on referred_user_id => no duplicates / last-click respected by cookie overwrite)
    const { error } = await admin.from("affiliate_referrals").insert({
      affiliate_user_id: link.user_id,
      referred_user_id: user.id,
    });
    if (error && !error.message.includes("duplicate")) {
      return json({ error: error.message }, 500);
    }

    // Notify affiliate of new signup (best-effort, non-fatal)
    if (!error) {
      try {
        const { data: affUser } = await admin.auth.admin.getUserById(link.user_id);
        const affEmail = affUser?.user?.email;
        if (affEmail) {
          const { data: profile } = await admin
            .from("profiles").select("display_name").eq("user_id", link.user_id).maybeSingle();
          const origin = Deno.env.get("SITE_URL") || "https://clienthunterai.com";
          await admin.functions.invoke("send-transactional-email", {
            body: {
              templateName: "new-referral-signup",
              recipientEmail: affEmail,
              idempotencyKey: `new-referral-${user.id}`,
              templateData: {
                name: profile?.display_name ?? null,
                dashboardUrl: `${origin}/dashboard/affiliate`,
              },
            },
          });
        }
      } catch (notifyErr) {
        console.error("Affiliate notification failed", notifyErr);
      }
    }

    return json({ ok: true });
  } catch (e) {
    console.error("affiliate-process-signup error:", e);
    return json({ error: "An unexpected error occurred" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
