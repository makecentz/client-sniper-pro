import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return jsonResponse({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const { lead_id, regenerate } = body as { lead_id?: string; regenerate?: "image" | "offer" | "all" };
    if (!lead_id) return jsonResponse({ error: "lead_id is required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pro plan check
    const { data: usage } = await admin
      .from("usage_tracking")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();
    if (!usage || usage.plan !== "pro") {
      return jsonResponse({ error: "Offer Builder is a Pro feature. Upgrade to generate website mockups." }, 402);
    }

    // Load lead
    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (leadErr || !lead) return jsonResponse({ error: "Lead not found" }, 404);

    // Load company settings & lead notes for context
    const [{ data: company }, { data: leadNotes }] = await Promise.all([
      admin.from("company_settings").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("lead_notes").select("content").eq("lead_id", lead_id).order("created_at", { ascending: false }).limit(5),
    ]);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "AI not configured" }, 500);

    // 1) BEFORE: Capture screenshot if missing and a website exists
    let beforeUrl: string | null = lead.screenshot_url;
    if (lead.website && lead.has_website && !beforeUrl) {
      const screenshotApiKey = Deno.env.get("SCREENSHOTONE_API_KEY");
      if (screenshotApiKey) {
        beforeUrl = `https://api.screenshotone.com/take?access_key=${encodeURIComponent(screenshotApiKey)}&url=${encodeURIComponent(lead.website)}&viewport_width=1280&viewport_height=900&format=jpg&quality=80&block_ads=true&delay=2`;
        await admin.from("leads").update({ screenshot_url: beforeUrl, screenshot_captured_at: new Date().toISOString() }).eq("id", lead_id);
      }
    }

    // Issues summary
    const issues: string[] = [];
    if (!lead.has_website) issues.push("no website");
    if (lead.website_error) issues.push("site errors / down");
    if (lead.no_ssl) issues.push("no SSL");
    if (lead.not_mobile_friendly) issues.push("not mobile-friendly");
    if (lead.outdated_copyright) issues.push("outdated design (old copyright)");

    const ctx = `Business: ${lead.business_name}
Category: ${lead.category || "general local business"}
Location: ${[lead.city, lead.state].filter(Boolean).join(", ") || "USA"}
Has website: ${lead.has_website ? "yes" : "no"}
Website: ${lead.website || "none"}
Website issues: ${issues.length ? issues.join(", ") : "none"}
AI audit: ${lead.ai_audit || "n/a"}
Lead notes: ${(leadNotes || []).map((n: any) => n.content).join(" | ") || "n/a"}
Phone: ${lead.phone || "n/a"}
Email: ${lead.email || "n/a"}
Sender company: ${company?.business_name || "Web design studio"}
Sender website price: ${company?.website_dev_price || "n/a"}
Sender current deal: ${company?.current_deal || "none"}`;

    // Find existing mockup row (one per lead per user)
    const { data: existing } = await admin
      .from("offer_mockups")
      .select("*")
      .eq("lead_id", lead_id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const needImage = !existing?.after_image_url || regenerate === "image" || regenerate === "all";
    const needOffer = !existing?.offer_standard || regenerate === "offer" || regenerate === "all";

    // 2) Generate design brief + after image
    let designBrief = existing?.design_brief || "";
    let afterImageUrl = existing?.after_image_url || null;
    let imagePrompt = existing?.image_prompt || "";

    if (needImage) {
      // Design brief
      const briefResp = await fetch(LOVABLE_AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a senior web designer. Output a concise design brief (max 120 words) describing the ideal modern homepage hero for the given local business. Include: dominant colors (with hex), layout pattern, hero imagery vibe, primary CTA, 2-3 trust elements, and one industry-specific feature (e.g. booking, menu, gallery). No headings, just a tight paragraph." },
            { role: "user", content: ctx },
          ],
        }),
      });
      if (briefResp.ok) {
        const briefData = await briefResp.json();
        designBrief = briefData.choices?.[0]?.message?.content?.trim() || designBrief;
      }

      imagePrompt = `Photorealistic screenshot of a modern, premium desktop website homepage for "${lead.business_name}", a ${lead.category || "local business"} in ${lead.city || "the US"}. Render as a real website UI captured at 1280x800 in a browser. Show full hero section: top navigation bar with logo and menu links, large hero headline, subheadline, prominent CTA button, hero imagery relevant to the niche, and a glimpse of the next section below. Clean modern typography, generous whitespace, conversion-focused layout. ${designBrief}. No browser chrome, no mockup frame, no text watermarks. Looks like an actual live website.`;

      // Generate image via Lovable AI Nano Banana
      const imgResp = await fetch(LOVABLE_AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!imgResp.ok) {
        const status = imgResp.status;
        if (status === 429) return jsonResponse({ error: "AI rate limit reached. Please try again in a moment." }, 429);
        if (status === 402) return jsonResponse({ error: "AI credits exhausted. Please add funds in workspace settings." }, 402);
        const errTxt = await imgResp.text();
        console.error("Image gen error:", status, errTxt);
        return jsonResponse({ error: "Mockup generation failed" }, 500);
      }

      const imgData = await imgResp.json();
      const dataUrl: string | undefined = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!dataUrl?.startsWith("data:image/")) {
        console.error("No image returned", JSON.stringify(imgData).slice(0, 500));
        return jsonResponse({ error: "Mockup image was not returned" }, 500);
      }

      // Decode base64 -> upload to storage
      const [meta, b64] = dataUrl.split(",");
      const mime = meta.match(/data:(image\/[^;]+)/)?.[1] || "image/png";
      const ext = mime.split("/")[1] || "png";
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `${userId}/${lead_id}/${Date.now()}.${ext}`;
      const { error: upErr } = await admin.storage.from("mockups").upload(path, bytes, {
        contentType: mime,
        upsert: false,
      });
      if (upErr) {
        console.error("Storage upload failed", upErr);
        return jsonResponse({ error: "Failed to save mockup image" }, 500);
      }
      const { data: pub } = admin.storage.from("mockups").getPublicUrl(path);
      afterImageUrl = pub.publicUrl;
    }

    // 3) Generate offer letter (3 variants)
    let offerShort = existing?.offer_short || "";
    let offerStandard = existing?.offer_standard || "";
    let offerPremium = existing?.offer_premium || "";

    if (needOffer) {
      const offerResp = await fetch(LOVABLE_AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You write personalized website redesign outreach for a web studio. Reference the business by name, mention the current site (or lack of one) honestly, and pitch a redesign tied to a visual concept the recipient will see attached. Friendly, confident, no fluff. Output STRICT JSON with keys: short, standard, premium. short = under 70 words. standard = 120-180 words email body (no subject, no signature placeholder beyond the sender info). premium = 220-300 words with bullet points. Each ends with a soft CTA inviting a quick call." },
            { role: "user", content: ctx },
          ],
          tools: [{
            type: "function",
            function: {
              name: "write_offer",
              description: "Three offer letter variants",
              parameters: {
                type: "object",
                properties: {
                  short: { type: "string" },
                  standard: { type: "string" },
                  premium: { type: "string" },
                },
                required: ["short", "standard", "premium"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "write_offer" } },
        }),
      });

      if (!offerResp.ok) {
        const status = offerResp.status;
        if (status === 429) return jsonResponse({ error: "AI rate limit reached. Please try again." }, 429);
        if (status === 402) return jsonResponse({ error: "AI credits exhausted." }, 402);
        const errTxt = await offerResp.text();
        console.error("Offer gen error:", status, errTxt);
        return jsonResponse({ error: "Offer letter generation failed" }, 500);
      }
      const offerData = await offerResp.json();
      const argsStr = offerData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      try {
        const parsed = JSON.parse(argsStr || "{}");
        offerShort = parsed.short || offerShort;
        offerStandard = parsed.standard || offerStandard;
        offerPremium = parsed.premium || offerPremium;
      } catch (e) {
        console.error("Failed to parse offer JSON", e, argsStr);
      }
    }

    // 4) Upsert mockup row
    let saved;
    if (existing) {
      const { data, error } = await admin.from("offer_mockups").update({
        before_image_url: beforeUrl,
        after_image_url: afterImageUrl,
        image_prompt: imagePrompt,
        design_brief: designBrief,
        offer_short: offerShort,
        offer_standard: offerStandard,
        offer_premium: offerPremium,
      }).eq("id", existing.id).select().maybeSingle();
      if (error) console.error("Update mockup failed", error);
      saved = data;
    } else {
      const { data, error } = await admin.from("offer_mockups").insert({
        user_id: userId,
        lead_id,
        before_image_url: beforeUrl,
        after_image_url: afterImageUrl,
        image_prompt: imagePrompt,
        design_brief: designBrief,
        offer_short: offerShort,
        offer_standard: offerStandard,
        offer_premium: offerPremium,
      }).select().maybeSingle();
      if (error) console.error("Insert mockup failed", error);
      saved = data;
    }

    // Also save standard variant to legacy offers table for the existing UI history
    if (needOffer && offerStandard) {
      await admin.from("offers").insert({
        user_id: userId,
        lead_id,
        content: offerStandard,
      });
    }

    return jsonResponse({ mockup: saved });
  } catch (e) {
    console.error("generate-offer-mockup error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
