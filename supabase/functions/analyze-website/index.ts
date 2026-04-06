import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function scrapeContactInfo(html: string): {
  scraped_name: string | null;
  scraped_phone: string | null;
  scraped_email: string | null;
  copyright_year: number | null;
} {
  // Company name: og:site_name or <title>
  let scrapedName: string | null = null;
  const ogMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);
  if (ogMatch) {
    scrapedName = ogMatch[1].trim();
  } else {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      // Clean up title — take first part before separators
      scrapedName = titleMatch[1].split(/[|\-–—]/)[0].trim() || titleMatch[1].trim();
    }
  }

  // Phone: US patterns
  let scrapedPhone: string | null = null;
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").match(phoneRegex);
  if (phones && phones.length > 0) {
    scrapedPhone = phones[0].trim();
  }

  // Email: filter out generic ones
  let scrapedEmail: string | null = null;
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const genericPrefixes = ["noreply", "no-reply", "mailer-daemon", "postmaster", "webmaster", "donotreply"];
  const cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  const emails = cleanHtml.match(emailRegex) || [];
  const goodEmails = emails.filter(e => !genericPrefixes.some(p => e.toLowerCase().startsWith(p)));
  if (goodEmails.length > 0) {
    scrapedEmail = goodEmails[0];
  } else if (emails.length > 0) {
    scrapedEmail = emails[0];
  }

  // Copyright year
  const copyrightRegex = /(?:©|&copy;|copyright)\s*(\d{4})/gi;
  const years: number[] = [];
  let match;
  while ((match = copyrightRegex.exec(html)) !== null) {
    years.push(parseInt(match[1]));
  }
  const copyrightYear = years.length > 0 ? Math.max(...years) : null;

  return { scraped_name: scrapedName, scraped_phone: scrapedPhone, scraped_email: scrapedEmail, copyright_year: copyrightYear };
}

async function checkWebsite(url: string): Promise<{
  website_error: boolean;
  no_ssl: boolean;
  not_mobile_friendly: boolean;
  outdated_copyright: boolean;
  website_issues: string[];
  scraped_name: string | null;
  scraped_phone: string | null;
  scraped_email: string | null;
  copyright_year: number | null;
}> {
  const issues: string[] = [];
  let websiteError = false;
  let noSsl = false;
  let notMobileFriendly = false;
  let outdatedCopyright = false;
  let scrapedData = { scraped_name: null as string | null, scraped_phone: null as string | null, scraped_email: null as string | null, copyright_year: null as number | null };

  if (url.startsWith("http://")) {
    noSsl = true;
    issues.push("No SSL");
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
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

    // Scrape contact info
    scrapedData = scrapeContactInfo(html);

    if (scrapedData.copyright_year && scrapedData.copyright_year < 2022) {
      outdatedCopyright = true;
      issues.push(`Outdated Copyright (${scrapedData.copyright_year})`);
    }
  } catch {
    websiteError = true;
    issues.push("Website Unreachable");
  }

  return { website_error: websiteError, no_ssl: noSsl, not_mobile_friendly: notMobileFriendly, outdated_copyright: outdatedCopyright, website_issues: issues, ...scrapedData };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { url, lead_id } = body;

    if (!url || typeof url !== "string" || url.length > 2000) {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Analyzing website:", formattedUrl);
    const result = await checkWebsite(formattedUrl);

    let priorityScore = 0;
    if (result.website_error) priorityScore += 15;
    if (result.no_ssl) priorityScore += 15;
    if (result.not_mobile_friendly) priorityScore += 15;
    if (result.outdated_copyright) priorityScore += 15;
    priorityScore = Math.min(priorityScore, 100);
    const priorityLabel = priorityScore >= 60 ? "high" : priorityScore >= 30 ? "medium" : "low";

    const updateData: Record<string, unknown> = {
      website: formattedUrl,
      has_website: true,
      website_error: result.website_error,
      no_ssl: result.no_ssl,
      not_mobile_friendly: result.not_mobile_friendly,
      outdated_copyright: result.outdated_copyright,
      website_issues: result.website_issues,
      score: "needs_upgrade",
      priority_score: priorityScore,
      priority_label: priorityLabel,
    };

    // Populate scraped fields if available
    if (result.scraped_phone) updateData.phone = result.scraped_phone;
    if (result.scraped_email) updateData.email = result.scraped_email;

    let returnLeadId = lead_id;

    if (lead_id) {
      const { error: updateError } = await supabase
        .from("leads").update(updateData).eq("id", lead_id).eq("user_id", user.id);
      if (updateError) {
        console.error("Update error:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update lead" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      let domain = formattedUrl;
      try { domain = new URL(formattedUrl).hostname.replace(/^www\./, ""); } catch { /* use raw */ }

      const { data: newLead, error: insertError } = await supabase
        .from("leads")
        .insert({
          user_id: user.id,
          business_name: result.scraped_name || domain,
          ...updateData,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to create lead" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      returnLeadId = newLead.id;
    }

    return new Response(JSON.stringify({
      lead_id: returnLeadId,
      ...updateData,
      ...result,
      priority_score: priorityScore,
      priority_label: priorityLabel,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-website error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
