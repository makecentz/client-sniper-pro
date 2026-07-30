import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getApiKey } from "../_shared/api-keys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebsiteCheck {
  website_error: boolean;
  no_ssl: boolean;
  not_mobile_friendly: boolean;
  outdated_copyright: boolean;
  copyright_year: number | null;
  website_issues: string[];
}

async function checkWebsite(url: string): Promise<WebsiteCheck> {
  const issues: string[] = [];
  let websiteError = false;
  let noSsl = false;
  let notMobileFriendly = false;
  let outdatedCopyright = false;
  let copyrightYear: number | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadChecker/1.0)" },
      redirect: "follow",
    });
    clearTimeout(timeout);

    const finalUrl = res.url || url;
    if (finalUrl.startsWith("http://")) {
      noSsl = true;
      issues.push("No SSL");
    }

    if (res.status >= 400) {
      websiteError = true;
      issues.push(`HTTP ${res.status}`);
    }

    const html = await res.text();

    if (!html.toLowerCase().includes('name="viewport"') && !html.toLowerCase().includes("name='viewport'")) {
      notMobileFriendly = true;
      issues.push("Not Mobile Friendly");
    }

    const copyrightRegex = /(?:©|&copy;|copyright)\s*(\d{4})/gi;
    const years: number[] = [];
    let match;
    while ((match = copyrightRegex.exec(html)) !== null) {
      years.push(parseInt(match[1]));
    }
    if (years.length > 0) {
      copyrightYear = Math.max(...years);
      if (copyrightYear < 2022) {
        outdatedCopyright = true;
        issues.push(`Outdated Copyright (${copyrightYear})`);
      }
    }
  } catch {
    websiteError = true;
    issues.push("Website Unreachable");
  }

  return { website_error: websiteError, no_ssl: noSsl, not_mobile_friendly: notMobileFriendly, outdated_copyright: outdatedCopyright, copyright_year: copyrightYear, website_issues: issues };
}

interface ScoreInput {
  has_website: boolean;
  website_error: boolean;
  no_ssl: boolean;
  not_mobile_friendly: boolean;
  outdated_copyright: boolean;
  copyright_year: number | null;
  rating: number | null;
  review_count: number;
}

function computeQualityScore(s: ScoreInput) {
  let penalty = 0;
  const reasons: string[] = [];

  if (!s.has_website) { penalty += 60; reasons.push("No website"); }
  if (s.website_error) { penalty += 25; reasons.push("Website unreachable / error"); }
  if (s.no_ssl) { penalty += 20; reasons.push("No SSL"); }
  if (s.not_mobile_friendly) { penalty += 20; reasons.push("Not mobile friendly"); }
  if (s.outdated_copyright) {
    if (s.copyright_year !== null && s.copyright_year < 2019) {
      penalty += 25; reasons.push(`Very outdated copyright (${s.copyright_year})`);
    } else {
      penalty += 15; reasons.push(`Outdated copyright (${s.copyright_year ?? "unknown"})`);
    }
  }
  if (s.rating !== null) {
    if (s.rating < 3.5) { penalty += 20; reasons.push(`Low rating (${s.rating})`); }
    else if (s.rating < 4.0) { penalty += 10; reasons.push(`Below-average rating (${s.rating})`); }
  }
  if (s.review_count < 3) { penalty += 15; reasons.push(`Very few reviews (${s.review_count})`); }
  else if (s.review_count < 10) { penalty += 10; reasons.push(`Few reviews (${s.review_count})`); }

  const quality_score = Math.max(0, 100 - penalty);
  const priority_score = 100 - quality_score;
  const priority_label = priority_score >= 60 ? "high" : priority_score >= 30 ? "medium" : "low";

  let score: string;
  if (priority_score >= 70) score = "hot";
  else if (!s.has_website) score = "no_website";
  else if (s.outdated_copyright) score = "outdated";
  else if (s.website_error || s.no_ssl || s.not_mobile_friendly) score = "weak_site";
  else if ((s.rating !== null && s.rating < 4.0) || s.review_count < 10) score = "low_reputation";
  else score = "needs_upgrade";

  return { quality_score, priority_score, priority_label, score, reasons };
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

    // Geocode the ZIP
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

    const OUTSCRAPER_API_KEY = await getApiKey("OUTSCRAPER_API_KEY");
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

    let savedNames = new Set<string>();
    if (exclude_saved) {
      const { data: saved } = await supabase
        .from("leads")
        .select("business_name")
        .eq("user_id", user.id);
      savedNames = new Set((saved || []).map((s: { business_name: string }) => s.business_name.toLowerCase()));
    }

    const haversine = (la1: number, lo1: number, la2: number, lo2: number) => {
      const R = 3958.8;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(la2 - la1);
      const dLon = toRad(lo2 - lo1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };

    // Pre-filter by radius / saved / min rating before website checks (perf)
    const candidates = raw.filter((r: any) => {
      const name: string = r.name || "Unknown Business";
      if (exclude_saved && savedNames.has(name.toLowerCase())) return false;
      const rating = typeof r.rating === "number" ? r.rating : null;
      if (minRating > 0 && (rating ?? 0) < minRating) return false;
      const blat = r.latitude;
      const blng = r.longitude;
      if (typeof blat === "number" && typeof blng === "number") {
        const d = haversine(lat, lng, blat, blng);
        if (d > radius) return false;
        (r as any).__distance = d;
      } else {
        (r as any).__distance = null;
      }
      return true;
    });

    // Run website checks in parallel
    const leadPromises = candidates.map(async (r: any) => {
      const rawSite = r.site || r.website || r.url || r.domain || null;
      const website = rawSite && typeof rawSite === "string" && rawSite.trim() !== "" ? rawSite.trim() : null;
      const hasWebsite = !!website;
      const rating: number | null = typeof r.rating === "number" ? r.rating : null;
      const reviewCount: number = typeof r.reviews === "number" ? r.reviews : 0;

      let websiteCheck: WebsiteCheck = {
        website_error: false,
        no_ssl: false,
        not_mobile_friendly: false,
        outdated_copyright: false,
        copyright_year: null,
        website_issues: [],
      };
      if (hasWebsite) {
        websiteCheck = await checkWebsite(website);
      }

      const { quality_score, priority_score, priority_label, score } = computeQualityScore({
        has_website: hasWebsite,
        website_error: websiteCheck.website_error,
        no_ssl: websiteCheck.no_ssl,
        not_mobile_friendly: websiteCheck.not_mobile_friendly,
        outdated_copyright: websiteCheck.outdated_copyright,
        copyright_year: websiteCheck.copyright_year,
        rating,
        review_count: reviewCount,
      });

      const allIssues = [...websiteCheck.website_issues];
      if (!hasWebsite) allIssues.unshift("No Website");
      if (rating !== null && rating < 4.0) allIssues.push(`Low rating (${rating})`);
      if (reviewCount < 10) allIssues.push(`Few reviews (${reviewCount})`);

      return {
        business_name: r.name || "Unknown Business",
        phone: r.phone || r.international_phone_number || "",
        address: r.full_address || r.address || "",
        category: r.type || r.category || null,
        rating,
        reviews: reviewCount,
        latitude: typeof r.latitude === "number" ? r.latitude : null,
        longitude: typeof r.longitude === "number" ? r.longitude : null,
        distance_miles: r.__distance ?? null,
        website,
        has_website: hasWebsite,
        website_error: websiteCheck.website_error,
        no_ssl: websiteCheck.no_ssl,
        not_mobile_friendly: websiteCheck.not_mobile_friendly,
        outdated_copyright: websiteCheck.outdated_copyright,
        website_issues: allIssues,
        score,
        priority_score,
        priority_label,
        quality_score,
      };
    });

    const allLeads = await Promise.all(leadPromises);

    // Only actionable leads
    const actionable = allLeads.filter((l) => l.quality_score <= 90);

    // Bucket + interleave so map shows a healthy mix
    const noWebsiteBucket = actionable
      .filter((l) => !l.has_website)
      .sort((a, b) => a.quality_score - b.quality_score);
    const weakWebsiteBucket = actionable
      .filter((l) => l.has_website)
      .sort((a, b) => a.quality_score - b.quality_score);

    const leads: typeof actionable = [];
    const maxLen = Math.max(noWebsiteBucket.length, weakWebsiteBucket.length);
    for (let i = 0; i < maxLen; i++) {
      if (weakWebsiteBucket[i]) leads.push(weakWebsiteBucket[i]);
      if (noWebsiteBucket[i]) leads.push(noWebsiteBucket[i]);
    }

    console.log(`[heatmap-search] candidates=${candidates.length} actionable=${actionable.length} weak=${weakWebsiteBucket.length} no_site=${noWebsiteBucket.length}`);

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
