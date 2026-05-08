// Creates an affiliate link for the calling user if they don't have one
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: existing } = await admin
      .from("affiliate_links").select("*").eq("user_id", user.id).maybeSingle();
    if (existing) return json({ link: existing });

    let attempt = 0;
    while (attempt < 5) {
      const code = generateCode();
      const { data, error } = await admin
        .from("affiliate_links")
        .insert({ user_id: user.id, referral_code: code })
        .select()
        .single();
      if (!error) return json({ link: data });
      if (!error.message.includes("duplicate")) {
        console.error("affiliate-create-link insert error:", error);
        return json({ error: "An unexpected error occurred" }, 500);
      }
      attempt++;
    }
    return json({ error: "Could not generate unique code" }, 500);
  } catch (e) {
    console.error("affiliate-create-link error:", e);
    return json({ error: "An unexpected error occurred" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
