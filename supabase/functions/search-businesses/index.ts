import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate input
    const body = await req.json();
    const { city, state, business_type, zip_code } = body;

    if (!city || typeof city !== "string" || city.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid city" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!business_type || typeof business_type !== "string" || business_type.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid business type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (zip_code && (typeof zip_code !== "string" || !/^\d{1,10}$/.test(zip_code))) {
      return new Response(JSON.stringify({ error: "Invalid zip code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check usage limits
    const { data: usage } = await supabase
      .from("usage_tracking")
      .select("searches_today, leads_remaining, plan, last_search_date")
      .eq("user_id", user.id)
      .single();

    if (!usage) {
      return new Response(JSON.stringify({ error: "Usage record not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const searchesToday = usage.last_search_date === today ? usage.searches_today : 0;
    const maxSearches = usage.plan === "pro" ? 50 : 3;

    if (searchesToday >= maxSearches) {
      return new Response(JSON.stringify({ error: "Daily search limit reached. Upgrade to Pro for more searches." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Outscraper API
    const OUTSCRAPER_API_KEY = Deno.env.get("OUTSCRAPER_API_KEY");
    if (!OUTSCRAPER_API_KEY) {
      return new Response(JSON.stringify({ error: "Outscraper API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const query = `${business_type} in ${city}${state ? `, ${state}` : ""}${zip_code ? ` ${zip_code}` : ""}`;
    const limit = usage.plan === "pro" ? 20 : 5;

    const outscraper = await fetch(
      `https://api.app.outscraper.com/maps/search-v3?query=${encodeURIComponent(query)}&limit=${limit}&async=false`,
      {
        headers: { "X-API-KEY": OUTSCRAPER_API_KEY },
      }
    );

    if (!outscraper.ok) {
      const errText = await outscraper.text();
      console.error("Outscraper error:", outscraper.status, errText);
      return new Response(JSON.stringify({ error: "Search service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const outsData = await outscraper.json();
    // Outscraper v3 returns { data: [[...results]] }
    const rawResults = outsData?.data?.[0] || [];

    const leads = rawResults.map((r: any) => ({
      business_name: r.name || "Unknown Business",
      phone: r.phone || r.international_phone_number || "",
      address: r.full_address || r.address || "",
      website: r.site || null,
      score: !r.site || r.site === "" ? "hot" : "needs_upgrade",
    }));

    // Update usage tracking
    await supabase
      .from("usage_tracking")
      .update({
        searches_today: searchesToday + 1,
        last_search_date: today,
      })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ leads }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("search-businesses error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
