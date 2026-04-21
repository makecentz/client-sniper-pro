import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

  if (url.startsWith("http://")) {
    noSsl = true;
    issues.push("No SSL");
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadChecker/1.0)" },
      redirect: "follow",
    });
    clearTimeout(timeout);

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
    const { city, state, business_type, zip_code } = body;

    if (!city || typeof city !== "string" || city.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid city" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!business_type || typeof business_type !== "string" || business_type.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid business type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (zip_code && (typeof zip_code !== "string" || !/^\d{1,10}$/.test(zip_code))) {
      return new Response(JSON.stringify({ error: "Invalid zip code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: usage } = await supabase
      .from("usage_tracking")
      .select("searches_today, leads_remaining, plan, last_search_date")
      .eq("user_id", user.id)
      .single();

    if (!usage) {
      return new Response(JSON.stringify({ error: "Usage record not found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const searchesToday = usage.last_search_date === today ? usage.searches_today : 0;
    const maxSearches = usage.plan === "pro" ? 50 : 3;

    if (searchesToday >= maxSearches) {
      return new Response(JSON.stringify({ error: "Daily search limit reached. Upgrade to Pro for more searches." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OUTSCRAPER_API_KEY = Deno.env.get("OUTSCRAPER_API_KEY");
    if (!OUTSCRAPER_API_KEY) {
      return new Response(JSON.stringify({ error: "Outscraper API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const query = `${business_type} in ${city}${state ? `, ${state}` : ""}${zip_code ? ` ${zip_code}` : ""}`;
    // Pull more results than we display so we can filter by quality_score
    const limit = usage.plan === "pro" ? 40 : 15;

    const outscraper = await fetch(
      `https://api.app.outscraper.com/maps/search-v3?query=${encodeURIComponent(query)}&limit=${limit}&async=false`,
      { headers: { "X-API-KEY": OUTSCRAPER_API_KEY } }
    );

    if (!outscraper.ok) {
      const errText = await outscraper.text();
      console.error("Outscraper error:", outscraper.status, errText);
      return new Response(JSON.stringify({ error: "Search service error" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const outsData = await outscraper.json();
    const rawResults = outsData?.data?.[0] || [];

    const leadPromises = rawResults.map(async (r: any) => {
      const website = r.site || null;
      const hasWebsite = !!website && website !== "";
      const email = r.email || (r.emails && r.emails.length > 0 ? r.emails[0] : null) || null;
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

      const { quality_score, priority_score, priority_label, score, reasons } = computeQualityScore({
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
        website,
        email,
        has_website: hasWebsite,
        website_error: websiteCheck.website_error,
        no_ssl: websiteCheck.no_ssl,
        not_mobile_friendly: websiteCheck.not_mobile_friendly,
        outdated_copyright: websiteCheck.outdated_copyright,
        website_issues: allIssues,
        score,
        priority_score,
        priority_label,
        rating,
        review_count: reviewCount,
        quality_score,
        quality_reasons: reasons,
      };
    });

    const allLeads = await Promise.all(leadPromises);
    // Surface only actionable leads (quality_score <= 90)
    const leads = allLeads
      .filter((l) => l.quality_score <= 90)
      .sort((a, b) => a.quality_score - b.quality_score);

    await supabase
      .from("usage_tracking")
      .update({ searches_today: searchesToday + 1, last_search_date: today })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ leads, total_scanned: allLeads.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("search-businesses error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
