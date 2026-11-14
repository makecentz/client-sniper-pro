import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@4";

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const schema = z.object({
  business_name: z.string().trim().min(1).max(160),
  website_url: z.union([z.literal(""), z.string().url().max(2048).refine(value => ["http:", "https:"].includes(new URL(value).protocol))]),
  phone: optionalText(40),
  email: z.union([z.literal(""), z.string().email().max(254)]),
  address: optionalText(300), city: optionalText(120), state: optionalText(120), zip: optionalText(20),
  industry: optionalText(120), opportunity_score: z.number().min(0).max(100),
  source: z.literal("clienthunter-ai"),
}).strict();

Deno.serve(async (req) => {
  const respond = (body: object, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Use POST" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return respond({ error: "Please sign in to send leads" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return respond({ error: "Connection unavailable" }, 503);
  try {
    const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error } = await client.auth.getUser(authorization.slice(7));
    if (error || !user) return respond({ error: "Please sign in to send leads" }, 401);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return respond({ error: "Invalid lead details", fields: parsed.error.issues.map(issue => issue.path.join(".")) }, 400);
    const key = Deno.env.get("LEAD_INGEST_API_KEY");
    if (!key) return respond({ error: "The admin must configure the Lead Tracker connection key" }, 503);
    // Only the shared receiving key leaves this app; never forward the user's session.
    const response = await fetch("https://ecomcommandcenter1.lovable.app/api/public/receive-lead", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify(parsed.data),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok !== true || typeof payload?.lead_id !== "string") {
      const message = response.status === 503
        ? "Ecomcommandcenter1 needs its LEAD_INGEST_API_KEY configured and published"
        : response.status === 401
          ? "The Lead Tracker connection keys do not match. Ask the admin to update them."
          : "Lead Tracker could not save this lead. Please try again.";
      return respond({ error: message, receiver_status: response.status }, 502);
    }
    return respond({ ok: true, lead_id: payload.lead_id });
  } catch {
    return respond({ error: "Could not reach Lead Tracker. Please try again." }, 502);
  }
});