import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { sendTemplateEmailAndLog } from "../_shared/transactional-email-templates/send-and-log.ts";

const BodySchema = z.object({
  submissionId: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  subject: z.string().max(150).optional().nullable(),
  message: z.string().min(1).max(2000),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { submissionId, name, email, subject, message } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Determine recipient(s): admin_settings key, else all users with admin role
    const recipients = new Set<string>();

    const { data: setting } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "contact_notification_email")
      .maybeSingle();
    const configured = (setting?.value as string | undefined)?.trim();
    if (configured) {
      configured.split(",").map((s) => s.trim()).filter(Boolean).forEach((e) => recipients.add(e));
    }

    if (recipients.size === 0) {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      for (const r of roleRows ?? []) {
        const { data: u } = await supabase.auth.admin.getUserById(r.user_id);
        const em = u?.user?.email;
        if (em) recipients.add(em);
      }
    }

    if (recipients.size === 0) {
      console.warn("No admin recipient configured for contact notifications");
      return new Response(JSON.stringify({ ok: true, warning: "no_admin_recipient" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: unknown[] = [];
    for (const to of recipients) {
      try {
        const data = await sendTemplateEmailAndLog("contact-notification", to, {
          idempotencyKey: `contact-notify-${submissionId}-${to}`,
          templateData: {
            name,
            email,
            subject: subject || "(no subject)",
            message,
            submittedAt: new Date().toISOString(),
          },
        });
        results.push({ to, ok: data.sent, data });
      } catch (error) {
        console.error("contact notification send error", error);
        results.push({ to, ok: false });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-contact-notification failed", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
