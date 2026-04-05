import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function checkWebsite(url: string): Promise<{
  website_error: boolean;
  no_ssl: boolean;
  not_mobile_friendly: boolean;
  outdated_copyright: boolean;
  website_issues: string[];
}> {
  const issues: string[] = [];
  let websiteError = false;
  let noSsl = false;
  let notMobileFriendly = false;
  let outdatedCopyright = false;

  // Check SSL
  if (url.startsWith("http://")) {
    noSsl = true;
    issues.push("No SSL");
  }

  // Fetch the website with timeout
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

    // Check mobile friendliness
    if (!html.toLowerCase().includes('name="viewport"') && !html.toLowerCase().includes("name='viewport'")) {
      notMobileFriendly = true;
      issues.push("Not Mobile Friendly");
    }

    // Check copyright year
    const copyrightRegex = /(?:©|&copy;|copyright)\s*(\d{4})/gi;
    const years: number[] = [];
    let match;
    while ((match = copyrightRegex.exec(html)) !== null) {
      years.push(parseInt(match[1]));
    }
    if (years.length > 0) {
      const maxYear = Math.max(...years);
      if (maxYear < 2022) {
        outdatedCopyright = true;
        issues.push(`Outdated Copyright (${maxYear})`);
      }
    }
  } catch {
    websiteError = true;
    issues.push("Website Unreachable");
  }

  return { website_error: websiteError, no_ssl: noSsl, not_mobile_friendly: notMobileFriendly, outdated_copyright: outdatedCopyright, website_issues: issues };
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

    // Verify user
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
    const rawResults = outsData?.data?.[0] || [];

    // Process each result with website quality checks in parallel
    const leadPromises = rawResults.map(async (r: any) => {
      const website = r.site || null;
      const hasWebsite = !!website && website !== "";
      const email = r.email || (r.emails && r.emails.length > 0 ? r.emails[0] : null) || null;

      let websiteCheck = {
        website_error: false,
        no_ssl: false,
        not_mobile_friendly: false,
        outdated_copyright: false,
        website_issues: [] as string[],
      };

      if (hasWebsite) {
        websiteCheck = await checkWebsite(website);
      }

      const isHot = !hasWebsite || websiteCheck.website_error || websiteCheck.no_ssl || websiteCheck.not_mobile_friendly || websiteCheck.outdated_copyright;
      const allIssues = [...websiteCheck.website_issues];
      if (!hasWebsite) allIssues.unshift("No Website");

      // Compute priority score (1-100)
      let priorityScore = 0;
      if (!hasWebsite) priorityScore += 40;
      if (websiteCheck.website_error) priorityScore += 15;
      if (websiteCheck.no_ssl) priorityScore += 15;
      if (websiteCheck.not_mobile_friendly) priorityScore += 15;
      if (websiteCheck.outdated_copyright) priorityScore += 15;
      // Boost for businesses with reviews but weak web presence
      const rating = r.rating || 0;
      const reviewCount = r.reviews || 0;
      if (rating >= 4.0 && reviewCount >= 10 && isHot) priorityScore += 20;
      priorityScore = Math.min(priorityScore, 100);

      const priorityLabel = priorityScore >= 60 ? "high" : priorityScore >= 30 ? "medium" : "low";

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
        score: isHot ? "hot" : "needs_upgrade",
        priority_score: priorityScore,
        priority_label: priorityLabel,
      };
    });

    const leads = await Promise.all(leadPromises);

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
