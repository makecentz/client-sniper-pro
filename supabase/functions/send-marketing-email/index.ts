// Admin-only: send a single marketing email (preview/test send).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { renderMarketingEmail, sendViaResend } from "../_shared/email-render.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const { to, subject, headline, body: emailBody, ctaLabel, ctaUrl, heroImageUrl } = body;
    if (!to || !subject) return json({ error: "to and subject are required" }, 400);

    const html = renderMarketingEmail({
      recipientEmail: to,
      subject,
      headline,
      body: emailBody || "",
      ctaLabel,
      ctaUrl,
      heroImageUrl,
    });

    const result = await sendViaResend({ to, subject: `[TEST] ${subject}`, html });
    if (result.error) {
      await supabase.from("marketing_email_log").insert({
        recipient_email: to, kind: "test", status: "failed", error: result.error,
      });
      return json({ error: result.error }, 500);
    }
    await supabase.from("marketing_email_log").insert({
      recipient_email: to, kind: "test", status: "sent", resend_message_id: result.id,
    });
    return json({ ok: true, id: result.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
