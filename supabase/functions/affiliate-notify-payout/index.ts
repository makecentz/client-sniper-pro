// Sends affiliate payout notifications (approved or paid).
// Admin-only: looks up the affiliate's email server-side and invokes
// send-transactional-email with the appropriate template.
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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Admin role check
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { payoutId, status } = await req.json();
    if (!payoutId || !["approved", "paid"].includes(status)) {
      return json({ error: "payoutId and status (approved|paid) required" }, 400);
    }

    const { data: payout } = await admin
      .from("affiliate_payouts")
      .select("id, affiliate_user_id, amount")
      .eq("id", payoutId)
      .maybeSingle();
    if (!payout) return json({ error: "Payout not found" }, 404);

    const { data: userInfo } = await admin.auth.admin.getUserById(payout.affiliate_user_id);
    const email = userInfo?.user?.email;
    if (!email) return json({ error: "Affiliate email not found" }, 404);

    const { data: profile } = await admin
      .from("profiles").select("display_name").eq("user_id", payout.affiliate_user_id).maybeSingle();

    const templateName = status === "approved" ? "payout-approved" : "payout-paid";
    await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName,
        recipientEmail: email,
        idempotencyKey: `payout-${status}-${payout.id}`,
        templateData: { name: profile?.display_name ?? null, amount: Number(payout.amount) },
      },
    });

    return json({ ok: true });
  } catch (e) {
    console.error("affiliate-notify-payout error:", e);
    return json({ error: "An unexpected error occurred" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
