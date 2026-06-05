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
  ai_score: number;
  ai_features_detected: string[];
  has_chatbot: boolean;
  has_ai_voice: boolean;
}

function detectAIFeatures(html: string): { ai_score: number; features: string[]; has_chatbot: boolean; has_ai_voice: boolean } {
  const lower = html.toLowerCase();
  const features: string[] = [];
  let has_chatbot = false;
  let has_ai_voice = false;
  const CHATBOTS: Array<[string, RegExp]> = [
    ["Intercom", /intercom(\.io|cdn|settings|messenger)/],
    ["Drift", /js\.driftt\.com|drift\.com\/ai/],
    ["Tidio", /tidio(chat)?\.com|code\.tidio/],
    ["Tawk.to", /embed\.tawk\.to|tawk\.to/],
    ["LiveChat", /cdn\.livechatinc|livechatinc\.com/],
    ["Crisp Chat", /client\.crisp\.chat|crisp\.chat/],
    ["HubSpot Chat", /js\.hs-scripts\.com|js\.usemessages\.com/],
    ["Zendesk Chat", /static\.zdassets\.com|zopim/],
    ["Ada Chatbot", /static\.ada\.support/],
    ["LivePerson", /lpcdn\.lpsnmedia|liveperson/],
    ["ManyChat", /manychat\.com/],
    ["Chatbase", /chatbase\.co/],
    ["Voiceflow Chat", /general-runtime\.voiceflow|cdn\.voiceflow/],
    ["Custom Chatbot", /(id|class)=["'][^"']*(chatbot|ai-assistant|chat-widget|ai-chat)[^"']*["']/],
  ];
  const VOICE: Array<[string, RegExp]> = [
    ["Vapi Voice AI", /vapi\.ai/],
    ["Bland AI", /bland\.ai/],
    ["Retell AI", /retellai\.com|retell\.ai/],
    ["Synthflow", /synthflow\.ai/],
    ["Air.ai", /air\.ai/],
    ["ElevenLabs Voice", /elevenlabs\.io\/convai|convai-widget/],
  ];
  const GENERIC: Array<[string, RegExp]> = [
    ["OpenAI Integration", /api\.openai\.com|openai\.com\/v1/],
    ["Anthropic Claude", /api\.anthropic\.com/],
    ["Google Gemini", /generativelanguage\.googleapis/],
    ["Dialogflow", /dialogflow\.com|dialogflow\.cloud/],
    ["AI Assistant Copy", /(powered by ai|ai assistant|ai-powered)/],
  ];
  for (const [name, re] of CHATBOTS) if (re.test(lower)) { features.push(name); has_chatbot = true; }
  for (const [name, re] of VOICE) if (re.test(lower)) { features.push(name); has_ai_voice = true; }
  for (const [name, re] of GENERIC) if (re.test(lower)) features.push(name);
  let ai_score = 0;
  if (has_chatbot) ai_score += 50;
  if (has_ai_voice) ai_score += 40;
  ai_score += Math.min(features.length * 5, 20);
  if (ai_score > 100) ai_score = 100;
  return { ai_score, features: Array.from(new Set(features)), has_chatbot, has_ai_voice };
}

function calculateRevenueLoss(args: { has_chatbot: boolean; has_ai_voice: boolean; review_count: number | null }): { revenue_loss: number; missed_customers: number } {
  if (args.has_chatbot && args.has_ai_voice) return { revenue_loss: 0, missed_customers: 0 };
  const reviews = args.review_count ?? 0;
  const monthly_visitors = Math.max(reviews * 20, 200);
  let missed = Math.round(monthly_visitors * 0.02 * 0.35);
  let loss = missed * 150;
  if (args.has_chatbot || args.has_ai_voice) { missed = Math.round(missed / 2); loss = Math.round(loss / 2); }
  return { revenue_loss: loss, missed_customers: missed };
}

async function checkWebsite(url: string): Promise<WebsiteCheck> {
  const issues: string[] = [];
  let websiteError = false;
  let noSsl = false;
  let notMobileFriendly = false;
  let outdatedCopyright = false;
  let copyrightYear: number | null = null;
  let ai = { ai_score: 0, features: [] as string[], has_chatbot: false, has_ai_voice: false };

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

    ai = detectAIFeatures(html);
  } catch {
    websiteError = true;
    issues.push("Website Unreachable");
  }

  return {
    website_error: websiteError, no_ssl: noSsl, not_mobile_friendly: notMobileFriendly,
    outdated_copyright: outdatedCopyright, copyright_year: copyrightYear, website_issues: issues,
    ai_score: ai.ai_score, ai_features_detected: ai.features, has_chatbot: ai.has_chatbot, has_ai_voice: ai.has_ai_voice,
  };
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

    // Require onboarding (company_settings row) before any search
    const { data: companySettings } = await supabase
      .from("company_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!companySettings) {
      return new Response(
        JSON.stringify({
          error: "Please complete onboarding before running searches.",
          code: "ONBOARDING_REQUIRED",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: usage } = await supabase
      .from("usage_tracking")
      .select("searches_today, leads_remaining, plan, last_search_date, lifetime_searches_used")
      .eq("user_id", user.id)
      .single();

    if (!usage) {
      return new Response(JSON.stringify({ error: "Usage record not found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const searchesToday = usage.last_search_date === today ? usage.searches_today : 0;
    const isProPlan = usage.plan === "pro";
    const lifetimeUsed = (usage as any).lifetime_searches_used ?? 0;
    const maxResults = isProPlan ? 50 : 5;

    if (!isProPlan) {
      // Free plan: one-time lifetime allowance of 2 searches
      if (lifetimeUsed >= 2) {
        return new Response(
          JSON.stringify({
            error: "You've used your 2 free searches. Upgrade to Pro to keep searching.",
            code: "FREE_LIMIT_REACHED",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      // Pro plan: keep the existing daily 50 cap
      if (searchesToday >= 50) {
        return new Response(
          JSON.stringify({ error: "Daily search limit reached.", code: "LIMIT_REACHED" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const OUTSCRAPER_API_KEY = Deno.env.get("OUTSCRAPER_API_KEY");
    if (!OUTSCRAPER_API_KEY) {
      return new Response(JSON.stringify({ error: "Outscraper API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const query = `${business_type} in ${city}${state ? `, ${state}` : ""}${zip_code ? ` ${zip_code}` : ""}`;
    // Pull more results so we get a healthy mix of with-website + no-website businesses
    const limit = usage.plan === "pro" ? 60 : 20;

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

    console.log(`[search-businesses] raw_count=${rawResults.length}`);
    if (rawResults.length > 0) {
      console.log(`[search-businesses] sample_keys=${JSON.stringify(Object.keys(rawResults[0]))}`);
      console.log(`[search-businesses] sample_site_fields=${JSON.stringify({ site: rawResults[0].site, website: rawResults[0].website, url: rawResults[0].url })}`);
    }

    const leadPromises = rawResults.map(async (r: any) => {
      // Outscraper field naming varies — try common ones
      const rawSite = r.site || r.website || r.url || r.domain || null;
      const website = rawSite && typeof rawSite === "string" && rawSite.trim() !== "" ? rawSite.trim() : null;
      const hasWebsite = !!website;
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

    const withWebsiteCount = allLeads.filter((l) => l.has_website).length;
    const withoutWebsiteCount = allLeads.length - withWebsiteCount;
    console.log(`[search-businesses] processed=${allLeads.length} with_website=${withWebsiteCount} without_website=${withoutWebsiteCount}`);

    // Surface only actionable leads (quality_score <= 90)
    const actionable = allLeads.filter((l) => l.quality_score <= 90);

    // Split into buckets so the result feed mixes both lead types
    const noWebsiteBucket = actionable
      .filter((l) => !l.has_website)
      .sort((a, b) => a.quality_score - b.quality_score);
    const weakWebsiteBucket = actionable
      .filter((l) => l.has_website)
      .sort((a, b) => a.quality_score - b.quality_score);

    // Interleave: alternate between weak-website and no-website so users always see a mix
    const leads: typeof actionable = [];
    const maxLen = Math.max(noWebsiteBucket.length, weakWebsiteBucket.length);
    for (let i = 0; i < maxLen; i++) {
      if (weakWebsiteBucket[i]) leads.push(weakWebsiteBucket[i]);
      if (noWebsiteBucket[i]) leads.push(noWebsiteBucket[i]);
    }

    const cappedLeads = leads.slice(0, maxResults);

    console.log(`[search-businesses] returned=${cappedLeads.length} weak_website=${weakWebsiteBucket.length} no_website=${noWebsiteBucket.length}`);

    await supabase
      .from("usage_tracking")
      .update({
        searches_today: searchesToday + 1,
        last_search_date: today,
        lifetime_searches_used: lifetimeUsed + 1,
      })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ leads: cappedLeads, total_scanned: allLeads.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("search-businesses error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
