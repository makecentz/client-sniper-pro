import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getApiKey } from "../_shared/api-keys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pro gate
    const { data: usage } = await admin
      .from("usage_tracking")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();
    if (!usage || usage.plan !== "pro") {
      return json({ error: "Pro plan required to generate website prompts." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const { lead_id, force } = body as { lead_id?: string; force?: boolean };
    if (!lead_id) return json({ error: "Missing lead_id" }, 400);

    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (leadErr || !lead) return json({ error: "Lead not found" }, 404);

    // Return cached prompt if available and not forced
    if (!force && lead.website_prompt) {
      return json({
        prompt: lead.website_prompt,
        photos: lead.gmaps_photos || [],
        cached: true,
      });
    }

    // Fetch Google Maps data via Outscraper if we don't have photos cached
    let photos: string[] = lead.gmaps_photos || [];
    let placeId: string | null = lead.gmaps_place_id || null;
    let hours: any = lead.gmaps_hours || null;
    let reviews: any[] = (lead.gmaps_reviews as any[]) || [];

    const OUTSCRAPER_API_KEY = await getApiKey("OUTSCRAPER_API_KEY");
    if (OUTSCRAPER_API_KEY && (photos.length === 0 || force)) {
      try {
        const query = encodeURIComponent(
          [lead.business_name, lead.address || lead.city || ""].filter(Boolean).join(", ")
        );
        const url = `https://api.app.outscraper.com/maps/search-v3?query=${query}&limit=1&async=false&fields=name,place_id,photos_sample,working_hours,reviews_per_score`;
        const resp = await fetch(url, { headers: { "X-API-KEY": OUTSCRAPER_API_KEY } });
        if (resp.ok) {
          const j = await resp.json();
          const place = j?.data?.[0]?.[0] ?? j?.data?.[0] ?? null;
          if (place) {
            placeId = place.place_id || placeId;
            hours = place.working_hours || hours;
            const sample = place.photos_sample || place.photos || [];
            photos = (Array.isArray(sample) ? sample : [])
              .map((p: any) => (typeof p === "string" ? p : p?.photo_url || p?.url))
              .filter(Boolean)
              .slice(0, 8);
          }
        } else {
          console.warn("Outscraper non-OK", resp.status);
        }
      } catch (e) {
        console.error("Outscraper error", e);
      }
    }

    const photoBlock = photos.length
      ? photos.map((u, i) => `${i + 1}. ${u}`).join("\n")
      : "(no Google photos available — design a tasteful placeholder hero)";

    const factSheet = `Business: ${lead.business_name}
Category: ${lead.category || "Local business"}
Address: ${lead.address || ""}${lead.city ? ", " + lead.city : ""}${lead.state ? ", " + lead.state : ""}${lead.zip ? " " + lead.zip : ""}
Phone: ${lead.phone || "N/A"}
Email: ${lead.email || "N/A"}
Existing website: ${lead.website || "None"}
Google rating: ${lead.rating ?? "N/A"} (${lead.review_count ?? 0} reviews)
Hours: ${hours ? JSON.stringify(hours) : "Not provided"}
Sample reviews: ${reviews?.length ? JSON.stringify(reviews.slice(0, 3)) : "Not provided"}
Photos:
${photoBlock}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You write build prompts for Lovable.dev. Output ONLY the final prompt as Markdown — no preamble. The prompt must instruct Lovable to build a polished, conversion-focused single-page marketing website for the given local business, using the supplied Google Maps photo URLs as hero/gallery imagery, the real contact info, and an embedded Google Map of the address. Include sections: Hero (with one photo as background), About, Services (inferred from the business category), Photo Gallery (using the remaining Google photo URLs), Reviews/Testimonials, Contact (form + click-to-call + address). Specify a tasteful, modern design tone fitting the category, mobile responsive, semantic HTML, and SEO meta tags. Be concrete: list the exact photo URLs to use, the exact phone, address, and business name. Keep the prompt under 500 words.",
          },
          {
            role: "user",
            content: `Write the Lovable.dev build prompt for this business:\n\n${factSheet}`,
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "AI rate limit reached. Try again shortly." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted. Please add funds." }, 402);
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return json({ error: "AI generation failed" }, 500);
    }

    const aiData = await aiResp.json();
    const prompt: string =
      aiData.choices?.[0]?.message?.content?.trim() || "Failed to generate prompt.";

    await admin
      .from("leads")
      .update({
        gmaps_photos: photos,
        gmaps_place_id: placeId,
        gmaps_hours: hours,
        gmaps_reviews: reviews,
        website_prompt: prompt,
        website_prompt_generated_at: new Date().toISOString(),
      })
      .eq("id", lead_id);

    return json({ prompt, photos, cached: false });
  } catch (e) {
    console.error("generate-website-prompt error:", e);
    return json({ error: "An unexpected error occurred" }, 500);
  }
});
