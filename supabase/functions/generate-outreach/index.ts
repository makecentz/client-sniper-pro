import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = { id: claimsData.claims.sub as string };

    const { type, lead } = await req.json();

    if (!type || !lead?.business_name) {
      return new Response(JSON.stringify({ error: "Missing type or lead data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's company settings
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: companySettings } = await adminClient
      .from("company_settings")
      .select("business_name, website_url, phone, email, website_dev_price, current_deal")
      .eq("user_id", user.id)
      .maybeSingle();

    const companyContext = companySettings
      ? `\n\nYour Company Info (use this to personalize the message — sign off with your details):
Company: ${companySettings.business_name || "N/A"}
Website: ${companySettings.website_url || "N/A"}
Phone: ${companySettings.phone || "N/A"}
Email: ${companySettings.email || "N/A"}
Website Development Price: ${companySettings.website_dev_price || "N/A"}
Current Deal/Promotion: ${companySettings.current_deal || "None"}`
      : "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build website issues summary
    const issues: string[] = [];
    if (!lead.has_website) issues.push("No website at all");
    if (lead.website_error) issues.push("Website returns errors/is down");
    if (lead.no_ssl) issues.push("No SSL certificate (not secure, shows 'Not Secure' in browsers)");
    if (lead.not_mobile_friendly) issues.push("Website is not mobile-friendly");
    if (lead.outdated_copyright) issues.push("Website has outdated copyright (pre-2022, looks abandoned)");
    const issuesSummary = issues.length > 0
      ? `\nWebsite Issues Found: ${issues.join("; ")}`
      : "\nWebsite Issues Found: None — site appears OK";

    const leadContext = `Business: ${lead.business_name}
Website: ${lead.website || "No website"}
Phone: ${lead.phone || "Unknown"}
Email: ${lead.email || "Unknown"}
Address: ${lead.address || "Unknown"}
Score: ${lead.score || "Unknown"}
Priority: ${lead.priority_label || "Unknown"} (${lead.priority_score || 0}/100)${issuesSummary}
AI Audit: ${lead.ai_audit || "Not available"}${companyContext}`;

    const prompts: Record<string, string> = {
      email: `Write a professional cold outreach email to pitch web design/development services to this local business. Be personalized based on their details. IMPORTANT: If there are website issues listed, mention them specifically as pain points (e.g. "I noticed your site doesn't have an SSL certificate, which means visitors see a 'Not Secure' warning"). If they have no website, emphasize the need for one. Keep it concise (under 200 words), friendly, and include a clear call-to-action for a brief call. Use the sender's company info for the signature and any pricing/deal info.\n\n${leadContext}`,
      dm: `Write a short, casual social media DM (under 80 words) to pitch web design services to this business. Be friendly, use 1-2 emojis, reference something specific about their business. If there are website issues, briefly mention one as a hook. If sender company info is available, mention it naturally.\n\n${leadContext}`,
      sms: `Write a very brief SMS (under 50 words) to pitch web design services. If there are website issues, hint at one. Include a soft CTA. Professional but conversational. Use sender's name/company if available.\n\n${leadContext}`,
      offer: `Create a detailed service offer/proposal for this business. Include:\n- Custom website package with pricing (use the sender's actual price if provided)\n- Monthly maintenance pricing\n- List of included features (SEO, responsive design, contact forms, etc.)\n- IMPORTANT: Address each specific website issue found — explain why it matters and how you'll fix it\n- Include any current deal/promotion the sender has\n- ROI justification\nFormat it cleanly with bullet points and emojis. Use the sender's company branding.\n\n${leadContext}`,
      followup1: `Write a first follow-up message (email style, under 150 words) for a business that didn't respond to the initial outreach about web design services. If there are website issues, reference one they may not realize (e.g. "Did you know your site shows as 'Not Secure' to visitors?"). Reference social proof. Be persistent but respectful. Sign with sender's company info.\n\n${leadContext}`,
      followup2: `Write a final follow-up message (email style, under 120 words) for a business that hasn't responded to two previous outreach attempts about web design services. Create gentle urgency (limited spots). Be warm and give them an easy out. Include any current deal. Sign with sender's company info.\n\n${leadContext}`,
      audit: `Perform a website audit analysis for this business. IMPORTANT: Use the actual website issues data provided — don't guess. For each issue found, explain:\n- What the issue is\n- Why it hurts their business (lost customers, poor Google ranking, etc.)\n- How to fix it\nAlso evaluate:\n- Missing features (booking, contact forms, reviews)\n- Competitor advantage\n- Specific recommendations for improvement\nBe specific and actionable. Format with headers and bullet points.\n\n${leadContext}`,
      video_script: `Write a 15-30 second video pitch script for TikTok/Instagram Reels targeting this specific business. Structure:
- HOOK (first 3 seconds — grab attention, e.g. "Hey [business name], did you know...")
- PROBLEM (what they're missing — use their actual website issues)
- OFFER (what you can do for them)
- CTA (clear next step)
Keep it natural, conversational, and energetic. Include stage directions in brackets. Under 80 words.\n\n${leadContext}`,
      call_script: `Write a cold call script for pitching web design services to this business. Structure:
- OPENING LINE (introduce yourself, mention something specific about their business)
- DISCOVERY QUESTIONS (2-3 questions to uncover pain points)
- PITCH (bridge their pain to your solution, reference their specific website issues)
- OBJECTION HANDLING (3 common objections with responses: "too expensive", "we already have a website", "not interested right now")
- CLOSING (ask for a meeting or send a proposal)
Keep it natural and conversational, not robotic.\n\n${leadContext}`,
      proposal: `Generate a comprehensive client proposal for this business. Structure it as follows:

# Proposal for [Business Name]

## Executive Summary
Brief overview of what you found and what you propose.

## Current Analysis
- List each specific website issue found and its business impact
- Quantify potential lost revenue where possible

## Proposed Solution
- Detailed scope of work
- Features included (responsive design, SEO, contact forms, booking, etc.)
- Timeline estimate

## Investment
- Use the sender's actual pricing if provided
- Include monthly maintenance option
- Show ROI projection

## Why Choose Us
- Include sender's company details and value props

## Next Steps
- Clear CTA

Format with markdown headers and bullet points.\n\n${leadContext}`,
      why_this_lead: `Analyze this business lead and provide exactly 3 short bullet points explaining why this is a good potential client for web design services. Be specific and reference their actual data (website issues, location, business type). Each bullet should be 1 sentence max. Format as a simple bullet list with no headers.\n\n${leadContext}`,
      competitor_insight: `Analyze the competitive landscape for this business. Based on their business type and location, provide:
- How competitors in their niche typically present online
- What this business is missing compared to competitors (based on their website issues)
- 2-3 specific advantages competitors likely have (online booking, modern design, mobile-friendly, etc.)
- A brief recommendation on how to position against competitors
Keep it concise (under 150 words) and actionable.\n\n${leadContext}`,
    };

    const prompt = prompts[type];
    if (!prompt) {
      return new Response(JSON.stringify({ error: `Invalid type: ${type}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are an expert sales copywriter specializing in selling web design and digital marketing services to local businesses. Write compelling, personalized outreach that converts. Output only the message content — no meta commentary.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit reached. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "Failed to generate content.";

    // Save to DB based on type
    if (type === "offer") {
      await supabase.from("offers").insert({
        user_id: user.id,
        lead_id: lead.id,
        content,
      });
    } else if (type === "proposal") {
      await supabase.from("proposals").insert({
        user_id: user.id,
        lead_id: lead.id,
        content,
      });
    } else if (type === "why_this_lead") {
      // Store as ai_insight on the lead
      await adminClient
        .from("leads")
        .update({ ai_insight: content })
        .eq("id", lead.id);
    } else if (type === "competitor_insight") {
      await adminClient
        .from("leads")
        .update({ competitor_insight: content })
        .eq("id", lead.id);
    } else {
      const dbType = ["email", "dm", "sms"].includes(type) ? type : "email";
      await supabase.from("messages").insert({
        user_id: user.id,
        lead_id: lead.id,
        type: dbType,
        content,
      });
    }

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-outreach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
