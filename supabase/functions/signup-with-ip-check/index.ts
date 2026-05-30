import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    null
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, password, display_name } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = getClientIp(req);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check for existing account with this IP
    if (ip) {
      const { data: existing, error: checkErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("signup_ip", ip)
        .limit(1)
        .maybeSingle();

      if (checkErr) {
        console.error("IP check failed:", checkErr);
      }

      if (existing) {
        return new Response(
          JSON.stringify({
            error:
              "An account already exists for this IP address. Please consult with the existing account holder — only one account is allowed per IP.",
            code: "ip_already_registered",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Create the user
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: display_name ? { display_name } : undefined,
    });

    if (createErr || !created.user) {
      return new Response(
        JSON.stringify({ error: createErr?.message || "Failed to create account." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Record the IP on the auto-created profile (handle_new_user trigger created it)
    if (ip) {
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ signup_ip: ip, last_ip: ip, last_ip_at: new Date().toISOString() })
        .eq("user_id", created.user.id);
      if (updErr) console.error("Failed to record signup IP:", updErr);
    }

    return new Response(JSON.stringify({ success: true, user_id: created.user.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("signup-with-ip-check error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
