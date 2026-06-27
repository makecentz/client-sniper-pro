// Shared marketing email HTML renderer.
// Converts the WYSIWYG body (HTML) and structured fields into a polished, responsive email.

export interface MarketingEmailFields {
  subject: string;
  headline?: string;
  body: string; // can be HTML from the WYSIWYG editor
  ctaLabel?: string;
  ctaUrl?: string;
  heroImageUrl?: string | null;
  unsubscribeUrl?: string;
  recipientEmail: string;
}

export function renderMarketingEmail(f: MarketingEmailFields): string {
  const safeHeadline = f.headline?.trim() || "";
  const safeBody = (f.body || "").trim();
  const cta = f.ctaLabel && f.ctaUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
         <tr><td style="border-radius:8px;background:#3B82F6;">
           <a href="${escapeAttr(f.ctaUrl)}" style="display:inline-block;padding:14px 28px;font-weight:600;font-family:Inter,Arial,sans-serif;color:#fff;text-decoration:none;font-size:15px;">${escapeHtml(f.ctaLabel)}</a>
         </td></tr>
       </table>` : "";

  const hero = f.heroImageUrl
    ? `<img src="${escapeAttr(f.heroImageUrl)}" alt="" style="width:100%;max-width:560px;border-radius:12px;display:block;margin:0 auto 24px;" />`
    : "";

  const footerUnsub = f.unsubscribeUrl
    ? `<p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">You're receiving this because you signed up for ClientHunter AI as ${escapeHtml(f.recipientEmail)}. <a href="${escapeAttr(f.unsubscribeUrl)}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>.</p>`
    : "";

  return `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(f.subject)}</title></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:Inter,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0F172A;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 32px 8px;">
          <div style="font-weight:700;font-size:18px;color:#0F172A;">ClientHunter AI</div>
        </td></tr>
        <tr><td style="padding:8px 32px 32px;">
          ${hero}
          ${safeHeadline ? `<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#0F172A;">${escapeHtml(safeHeadline)}</h1>` : ""}
          <div style="font-size:15px;line-height:1.65;color:#334155;">${safeBody}</div>
          ${cta}
          ${footerUnsub}
        </td></tr>
      </table>
      <div style="margin-top:16px;font-size:11px;color:#64748b;">ClientHunter AI · clienthunterai.com</div>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}

export async function sendViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}): Promise<{ id?: string; error?: string }> {
  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
  const RESEND = Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE || !RESEND) return { error: "Resend not configured" };

  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE}`,
      "X-Connection-Api-Key": RESEND,
    },
    body: JSON.stringify({
      from: opts.from || "ClientHunter AI <notify@clienthunterai.com>",
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      reply_to: opts.replyTo,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data?.message || `HTTP ${res.status}` };
  return { id: data?.id };
}
