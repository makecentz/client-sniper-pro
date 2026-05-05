// Records a referral when a new user signs up with a referral code
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { referralCode } = await req.json();
    if (!referralCode || typeof referralCode !== "string") {
      return json({ error: "referralCode required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: link } = await admin
      .from("affiliate_links")
      .select("user_id")
      .eq("referral_code", referralCode)
      .maybeSingle();

    if (!link) return json({ error: "Invalid code" }, 404);
    if (link.user_id === user.id) return json({ error: "Cannot refer yourself" }, 400);

    // Insert referral (unique on referred_user_id => no duplicates)
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
          const origin = req.headers.get("origin") || "https://clienthunterai.com";
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
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
