import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string" || url.length > 2000) {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SCREENSHOTONE_API_KEY = Deno.env.get("SCREENSHOTONE_API_KEY");
    if (!SCREENSHOTONE_API_KEY) {
      return new Response(JSON.stringify({ error: "ScreenshotOne API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build ScreenshotOne URL — returns the image directly
    const screenshotUrl = `https://api.screenshotone.com/take?access_key=${encodeURIComponent(SCREENSHOTONE_API_KEY)}&url=${encodeURIComponent(url)}&viewport_width=1280&viewport_height=900&format=jpg&quality=80&block_ads=true&delay=2`;

    // Build ScreenshotOne URL — proxy the image so the API key is never sent to the client
    const screenshotUrl = `https://api.screenshotone.com/take?access_key=${encodeURIComponent(SCREENSHOTONE_API_KEY)}&url=${encodeURIComponent(url)}&viewport_width=1280&viewport_height=900&format=jpg&quality=80&block_ads=true&delay=2`;

    const imgResp = await fetch(screenshotUrl);
    if (!imgResp.ok) {
      console.error("ScreenshotOne error", imgResp.status);
      return new Response(JSON.stringify({ error: "Screenshot capture failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    return new Response(JSON.stringify({ screenshot_url: dataUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("capture-screenshot error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
