import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "No signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Log the webhook event
  await supabase.from("webhook_logs").insert({
    event_type: event.type,
    source: "stripe",
    payload: event.data.object as any,
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const type = session.metadata?.type;

    if (!userId) {
      console.error("No user_id in session metadata");
      return new Response(JSON.stringify({ error: "No user_id in metadata" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "pro_subscription") {
      const { error } = await supabase
        .from("usage_tracking")
        .update({ plan: "pro", leads_remaining: 9999 })
        .eq("user_id", userId);

      if (error) {
        console.error("Failed to update usage_tracking for pro:", error);
        return new Response(JSON.stringify({ error: "DB update failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log(`User ${userId} upgraded to pro`);

      // === Affiliate conversion ===
      try {
        const { data: referral } = await supabase
          .from("affiliate_referrals")
          .select("id, affiliate_user_id, converted_to_pro")
          .eq("referred_user_id", userId)
          .maybeSingle();

        if (referral && !referral.converted_to_pro) {
          // Get commission rate and pro price
          const { data: settings } = await supabase
            .from("admin_settings")
            .select("key,value")
            .in("key", ["affiliate_commission_rate", "pro_price_monthly"]);
          const rate = parseFloat(settings?.find((s) => s.key === "affiliate_commission_rate")?.value ?? "30");
          const proPrice = parseFloat(settings?.find((s) => s.key === "pro_price_monthly")?.value ?? "25");
          const amount = +(proPrice * (rate / 100)).toFixed(2);

          await supabase
            .from("affiliate_referrals")
            .update({ converted_to_pro: true, converted_at: new Date().toISOString() })
            .eq("id", referral.id);

          await supabase.from("affiliate_commissions").insert({
            affiliate_user_id: referral.affiliate_user_id,
            referral_id: referral.id,
            amount,
            status: "pending",
          });
          console.log(`Affiliate commission $${amount} for user ${referral.affiliate_user_id}`);
        }
      } catch (affErr) {
        console.error("Affiliate processing failed:", affErr);
      }
    } else if (type === "lead_pack") {
      // Lead Pack adds 15 saved-lead slots (Pro users only).
      const { data: current, error: fetchError } = await supabase
        .from("usage_tracking")
        .select("bonus_saved_slots, plan")
        .eq("user_id", userId)
        .single();

      if (fetchError || !current) {
        console.error("Failed to fetch usage_tracking:", fetchError);
        return new Response(JSON.stringify({ error: "DB fetch failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newSlots = (current.bonus_saved_slots ?? 0) + 15;
      const { error } = await supabase
        .from("usage_tracking")
        .update({ bonus_saved_slots: newSlots })
        .eq("user_id", userId);

      if (error) {
        console.error("Failed to update bonus_saved_slots:", error);
        return new Response(JSON.stringify({ error: "DB update failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log(`User ${userId} purchased lead pack, bonus saved slots now ${newSlots}`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
