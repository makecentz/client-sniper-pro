// Public click tracker — captures referral click with rate-limiting + IP hashing.
// No auth required. CORS open.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { code } = await req.json();
    if (!code || typeof code !== "string") return json({ error: "code required" }, 400);

    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "";
    const ua = req.headers.get("user-agent") || "";
    const salt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ipHash = ip ? await sha256(ip + "|" + salt) : null;

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", salt);
    const { data, error } = await admin.rpc("record_affiliate_click", {
      _code: code, _ip_hash: ipHash, _user_agent: ua.slice(0, 500),
    });
    if (error) {
      console.error("affiliate-track-click rpc error:", error);
      return json({ error: "An unexpected error occurred" }, 500);
    }

    return json({ ok: true, tracked: !!data });
  } catch (e) {
    console.error("affiliate-track-click error:", e);
    return json({ error: "An unexpected error occurred" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
