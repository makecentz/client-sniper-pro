import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE =
  /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;

const CONTACT_PREFIXES = ["info@", "contact@", "hello@", "support@", "sales@", "admin@"];

// SSRF guard: block private/loopback/link-local hosts so a user-controlled
// lead.website cannot make the edge function probe internal infrastructure
// or cloud metadata endpoints.
function isSafeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    const h = u.hostname.toLowerCase();
    if (
      h === "localhost" || h === "0.0.0.0" || h === "::1" ||
      h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local") ||
      /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) ||
      /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
      /^fc[0-9a-f]{2}:/i.test(h) || /^fe80:/i.test(h)
    ) return false;
    return true;
  } catch { return false; }
}

function extractEmails(html: string): string[] {
  const raw = html.match(EMAIL_RE) || [];
  const cleaned = raw
    .map((e) => e.toLowerCase().trim())
    .filter((e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.endsWith(".gif") && !e.endsWith(".svg") && !e.endsWith(".css") && !e.endsWith(".js"));
  return [...new Set(cleaned)];
}

function extractPhones(html: string): string[] {
  const raw = html.match(PHONE_RE) || [];
  const cleaned = raw
    .map((p) => p.replace(/[^\d+]/g, ""))
    .filter((p) => p.length >= 10 && p.length <= 15);
  return [...new Set(cleaned)];
}

function formatPhone(digits: string): string {
  const d = digits.replace(/^\+?1/, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return digits;
}

function prioritizeEmails(emails: string[]): string[] {
  return emails.sort((a, b) => {
    const aP = CONTACT_PREFIXES.some((p) => a.startsWith(p)) ? 0 : 1;
    const bP = CONTACT_PREFIXES.some((p) => b.startsWith(p)) ? 0 : 1;
    return aP - bP;
  });
}

async function fetchPage(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ClientHunterBot/1.0)" },
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { lead_id } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch lead (RLS ensures ownership)
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("id, website, email, phone")
      .eq("id", lead_id)
      .single();

    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lead.website) {
      return new Response(JSON.stringify({ error: "Lead has no website" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set pending status
    await supabase
      .from("leads")
      .update({ contact_scrape_status: "pending" })
      .eq("id", lead_id);

    // Build URLs
    let baseUrl = lead.website.trim();
    if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
    baseUrl = baseUrl.replace(/\/+$/, "");

    const paths = ["", "/contact", "/contact-us", "/about", "/about-us"];
    const urls = paths.map((p) => `${baseUrl}${p}`).filter(isSafeUrl);
    if (urls.length === 0) {
      await supabase.from("leads").update({ contact_scrape_status: "no_data" }).eq("id", lead_id);
      return new Response(JSON.stringify({ error: "Invalid website URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all pages in parallel
    const pages = await Promise.all(urls.map(fetchPage));
    const combinedHtml = pages.join("\n");

    const allEmails = prioritizeEmails(extractEmails(combinedHtml));
    const allPhones = extractPhones(combinedHtml);

    let status = "no_data";
    if (allEmails.length > 0 && allPhones.length > 0) status = "success";
    else if (allEmails.length > 0 || allPhones.length > 0) status = "partial";

    // Build update
    const update: Record<string, unknown> = {
      scraped_emails: allEmails,
      scraped_phones: allPhones.map(formatPhone),
      contact_scrape_status: status,
      contact_scraped_at: new Date().toISOString(),
    };

    // Only fill primary fields if currently empty
    if (!lead.email && allEmails.length > 0) update.email = allEmails[0];
    if (!lead.phone && allPhones.length > 0) update.phone = formatPhone(allPhones[0]);

    await supabase.from("leads").update(update).eq("id", lead_id);

    return new Response(
      JSON.stringify({
        status,
        scraped_emails: allEmails,
        scraped_phones: allPhones.map(formatPhone),
        primary_email: update.email || lead.email,
        primary_phone: update.phone || lead.phone,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("scrape-lead-contacts error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
