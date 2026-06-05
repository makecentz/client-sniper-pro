import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { api_key, save } = await req.json();
    if (!api_key || typeof api_key !== "string" || !api_key.startsWith("sk-")) {
      return json({ error: "Invalid key format (must start with sk-)" }, 400);
    }

    // Validate by listing models
    const r = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${api_key}` },
    });
    if (!r.ok) {
      const t = await r.text();
      return json({ error: `OpenAI rejected the key: ${r.status}`, detail: t }, 400);
    }

    if (save) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { error } = await admin.from("user_api_keys").upsert(
        {
          user_id: user.id,
          provider: "openai",
          encrypted_key: api_key,
          last_validated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );
      if (error) return json({ error: error.message }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
