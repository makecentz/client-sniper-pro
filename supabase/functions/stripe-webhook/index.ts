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
    } else if (type === "lead_pack") {
      // First get current leads_remaining
      const { data: current, error: fetchError } = await supabase
        .from("usage_tracking")
        .select("leads_remaining")
        .eq("user_id", userId)
        .single();

      if (fetchError || !current) {
        console.error("Failed to fetch usage_tracking:", fetchError);
        return new Response(JSON.stringify({ error: "DB fetch failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("usage_tracking")
        .update({ leads_remaining: current.leads_remaining + 15 })
        .eq("user_id", userId);

      if (error) {
        console.error("Failed to update leads_remaining:", error);
        return new Response(JSON.stringify({ error: "DB update failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log(`User ${userId} purchased lead pack, now has ${current.leads_remaining + 15} leads`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
