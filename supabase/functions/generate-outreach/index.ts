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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const leadContext = `Business: ${lead.business_name}
Website: ${lead.website || "No website"}
Phone: ${lead.phone || "Unknown"}
Address: ${lead.address || "Unknown"}
Score: ${lead.score || "Unknown"}
AI Audit: ${lead.ai_audit || "Not available"}`;

    const prompts: Record<string, string> = {
      email: `Write a professional cold outreach email to pitch web design/development services to this local business. Be personalized based on their details. If they have no website, emphasize the need for one. If they have a website, suggest improvements. Keep it concise (under 200 words), friendly, and include a clear call-to-action for a brief call.\n\n${leadContext}`,
      dm: `Write a short, casual social media DM (under 80 words) to pitch web design services to this business. Be friendly, use 1-2 emojis, reference something specific about their business.\n\n${leadContext}`,
      sms: `Write a very brief SMS (under 50 words) to pitch web design services. Include a soft CTA. Professional but conversational.\n\n${leadContext}`,
      offer: `Create a detailed service offer/proposal for this business. Include:\n- Custom website package with pricing ($997 one-time)\n- Monthly maintenance ($49/mo)\n- List of included features (SEO, responsive design, contact forms, etc.)\n- A bonus offer with urgency\n- ROI justification\nFormat it cleanly with bullet points and emojis.\n\n${leadContext}`,
      followup1: `Write a first follow-up message (email style, under 150 words) for a business that didn't respond to the initial outreach about web design services. Reference social proof (e.g. other clients seeing 40% more calls). Be persistent but respectful.\n\n${leadContext}`,
      followup2: `Write a final follow-up message (email style, under 120 words) for a business that hasn't responded to two previous outreach attempts about web design services. Create gentle urgency (limited spots). Be warm and give them an easy out.\n\n${leadContext}`,
      audit: `Perform a website audit analysis for this business. Evaluate:\n- Overall web presence (do they have a site?)\n- Mobile responsiveness likelihood\n- SEO basics (would they rank for local searches?)\n- Missing features (booking, contact forms, reviews)\n- Competitor advantage\n- Specific recommendations for improvement\nBe specific and actionable. Format with headers and bullet points.\n\n${leadContext}`,
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

    // Save to DB
    const dbType = ["email", "dm", "sms"].includes(type) ? type : "email";
    if (type === "offer") {
      await supabase.from("offers").insert({
        user_id: user.id,
        lead_id: lead.id,
        content,
      });
    } else {
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
