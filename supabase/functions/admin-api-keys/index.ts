// Admin-only management of third-party API keys stored in public.app_api_keys.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MANAGED_KEYS, maskKey, type ManagedKey } from "../_shared/api-keys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const adminClient = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function testKey(name: string, value: string): Promise<{ ok: boolean; message: string }> {
  try {
    if (!value) return { ok: false, message: "No value configured" };
    switch (name) {
      case "STRIPE_SECRET_KEY": {
        const r = await fetch("https://api.stripe.com/v1/balance", {
          headers: { Authorization: `Bearer ${value}` },
        });
        return r.ok
          ? { ok: true, message: "Stripe key is valid" }
          : { ok: false, message: `Stripe rejected the key (${r.status})` };
      }
      case "OUTSCRAPER_API_KEY": {
        const r = await fetch("https://api.outscraper.cloud/tasks?limit=1", {
          headers: { "X-API-KEY": value },
        });
        return r.ok
          ? { ok: true, message: "Outscraper key is valid" }
          : { ok: false, message: `Outscraper rejected the key (${r.status})` };
      }
      case "SCREENSHOTONE_API_KEY": {
        const r = await fetch(
          `https://api.screenshotone.com/usage?access_key=${encodeURIComponent(value)}`
        );
        return r.ok
          ? { ok: true, message: "ScreenshotOne key is valid" }
          : { ok: false, message: `ScreenshotOne rejected the key (${r.status})` };
      }
      case "GOOGLE_MAPS_API_KEY": {
        const r = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=New+York&key=${encodeURIComponent(value)}`
        );
        const d = await r.json().catch(() => ({}));
        return d?.status === "OK" || d?.status === "ZERO_RESULTS"
          ? { ok: true, message: "Google Maps key is valid" }
          : { ok: false, message: d?.error_message || d?.status || "Google rejected the key" };
      }
      case "RESEND_API_KEY": {
        const r = await fetch("https://api.resend.com/domains", {
          headers: { Authorization: `Bearer ${value}` },
        });
        return r.ok
          ? { ok: true, message: "Resend key is valid" }
          : { ok: false, message: `Resend rejected the key (${r.status})` };
      }
      case "SITE_URL": {
        try {
          const u = new URL(value);
          return ["http:", "https:"].includes(u.protocol)
            ? { ok: true, message: "Valid URL" }
            : { ok: false, message: "URL must start with http:// or https://" };
        } catch {
          return { ok: false, message: "Not a valid URL" };
        }
      }
      default:
        return { ok: false, message: "No test available for this key" };
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Test failed" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = adminClient();
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { action, key_name, value } = await req.json().catch(() => ({}));

    if (key_name && !MANAGED_KEYS.includes(key_name as ManagedKey)) {
      return json({ error: "Unknown key" }, 400);
    }

    if (action === "list") {
      const { data: rows } = await admin.from("app_api_keys").select("key_name,value,updated_at");
      const byName = new Map((rows ?? []).map((r) => [r.key_name as string, r]));
      const keys = MANAGED_KEYS.map((name) => {
        const row = byName.get(name);
        const envVal = Deno.env.get(name) ?? "";
        const effective = (row?.value as string) || envVal;
        return {
          key_name: name,
          masked: maskKey(effective),
          source: row?.value ? "override" : envVal ? "builtin" : "missing",
          updated_at: row?.updated_at ?? null,
        };
      });
      return json({ keys });
    }

    if (action === "set") {
      if (typeof value !== "string" || !value.trim()) {
        return json({ error: "Value required" }, 400);
      }
      const { error } = await admin.from("app_api_keys").upsert(
        { key_name, value: value.trim(), updated_by: user.id, updated_at: new Date().toISOString() },
        { onConflict: "key_name" }
      );
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "clear") {
      const { error } = await admin.from("app_api_keys").delete().eq("key_name", key_name);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "test") {
      let candidate = typeof value === "string" && value.trim() ? value.trim() : "";
      if (!candidate) {
        const { data: row } = await admin
          .from("app_api_keys").select("value").eq("key_name", key_name).maybeSingle();
        candidate = (row?.value as string) || Deno.env.get(key_name) || "";
      }
      const result = await testKey(key_name, candidate);
      return json(result);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-api-keys error:", e);
    return json({ error: "Internal error" }, 500);
  }
});
