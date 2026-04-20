import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HeatmapLead {
  business_name: string;
  phone: string;
  address: string;
  category: string | null;
  rating: number | null;
  reviews: number | null;
  latitude: number | null;
  longitude: number | null;
  priority_score: number;
  priority_label: "high" | "medium" | "low";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { zip_code, radius_miles, business_type, min_rating, exclude_saved } = body;

    if (!zip_code || typeof zip_code !== "string" || !/^\d{5}$/.test(zip_code)) {
      return new Response(JSON.stringify({ error: "Invalid US ZIP code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const radius = Number(radius_miles);
    if (![1, 3, 5, 10, 25].includes(radius)) {
      return new Response(JSON.stringify({ error: "Invalid radius" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const niche = (typeof business_type === "string" && business_type.trim()) ? business_type.trim().slice(0, 100) : "businesses";
    const minRating = typeof min_rating === "number" ? min_rating : 0;

    // Plan/usage limits
    const { data: usage } = await supabase
      .from("usage_tracking")
      .select("searches_today, plan, last_search_date")
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
    const maxSearches = usage.plan === "pro" ? 50 : 2;
    if (searchesToday >= maxSearches) {
      return new Response(JSON.stringify({ error: "Daily search limit reached. Upgrade to Pro for more searches.", code: "LIMIT_REACHED" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Geocode the ZIP via Zippopotam.us (free, no key required)
    let lat: number;
    let lng: number;
    try {
      const geoRes = await fetch(`https://api.zippopotam.us/us/${zip_code}`);
      if (!geoRes.ok) {
        return new Response(JSON.stringify({ error: "Could not geocode ZIP code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const geoData = await geoRes.json();
      const place = geoData?.places?.[0];
      if (!place) {
        return new Response(JSON.stringify({ error: "Could not geocode ZIP code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      lat = parseFloat(place.latitude);
      lng = parseFloat(place.longitude);
    } catch (e) {
      console.error("Geocode error:", e);
      return new Response(JSON.stringify({ error: "Could not geocode ZIP code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Outscraper search
    const OUTSCRAPER_API_KEY = Deno.env.get("OUTSCRAPER_API_KEY");
    if (!OUTSCRAPER_API_KEY) {
      return new Response(JSON.stringify({ error: "Search service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limit = usage.plan === "pro" ? 50 : 20;
    const query = `${niche} near ${zip_code}`;
    const outsUrl = `https://api.app.outscraper.com/maps/search-v3?query=${encodeURIComponent(query)}&limit=${limit}&async=false`;
    const outsRes = await fetch(outsUrl, { headers: { "X-API-KEY": OUTSCRAPER_API_KEY } });
    if (!outsRes.ok) {
      const errText = await outsRes.text();
      console.error("Outscraper error:", outsRes.status, errText);
      return new Response(JSON.stringify({ error: "Search service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const outsData = await outsRes.json();
    const raw = outsData?.data?.[0] || [];

    // Already-saved business names for this user (for exclude flag)
    let savedNames = new Set<string>();
    if (exclude_saved) {
      const { data: saved } = await supabase
        .from("leads")
        .select("business_name")
        .eq("user_id", user.id);
      savedNames = new Set((saved || []).map((s: { business_name: string }) => s.business_name.toLowerCase()));
    }

    // Filter to no-website only + radius + rating + dedupe
    const haversine = (la1: number, lo1: number, la2: number, lo2: number) => {
      const R = 3958.8;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(la2 - la1);
      const dLon = toRad(lo2 - lo1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };

    const leads: (HeatmapLead & { distance_miles: number | null })[] = [];
    for (const r of raw) {
      const website = r.site || "";
      if (website && website.trim() !== "") continue; // no-website only

      const rating = typeof r.rating === "number" ? r.rating : null;
      if (minRating > 0 && (rating ?? 0) < minRating) continue;

      const name: string = r.name || "Unknown Business";
      if (exclude_saved && savedNames.has(name.toLowerCase())) continue;

      const blat = r.latitude ?? null;
      const blng = r.longitude ?? null;
      let distance: number | null = null;
      if (typeof blat === "number" && typeof blng === "number") {
        distance = haversine(lat, lng, blat, blng);
        if (distance > radius) continue;
      }

      // Priority: no website = base 60; rating/reviews boost
      let priority = 60;
      if ((rating ?? 0) >= 4.0 && (r.reviews ?? 0) >= 10) priority += 25;
      else if ((r.reviews ?? 0) >= 5) priority += 10;
      priority = Math.min(priority, 100);
      const label: "high" | "medium" | "low" = priority >= 75 ? "high" : priority >= 50 ? "medium" : "low";

      leads.push({
        business_name: name,
        phone: r.phone || r.international_phone_number || "",
        address: r.full_address || r.address || "",
        category: r.type || r.category || null,
        rating,
        reviews: typeof r.reviews === "number" ? r.reviews : null,
        latitude: blat,
        longitude: blng,
        priority_score: priority,
        priority_label: label,
        distance_miles: distance,
      });
    }

    leads.sort((a, b) => b.priority_score - a.priority_score);

    await supabase
      .from("usage_tracking")
      .update({ searches_today: searchesToday + 1, last_search_date: today })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ center: { lat, lng }, leads }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("heatmap-search error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
