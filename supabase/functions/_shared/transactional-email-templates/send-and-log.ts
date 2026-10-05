import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail, type SendTemplateEmailOptions } from './send-email.ts'

// Sends a registered template and records the outcome in email_send_log.
// The log row never decides the send result.
export async function sendTemplateEmailAndLog(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {},
) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const log = async (status: 'sent' | 'suppressed' | 'failed', error_message?: string) => {
    const { error } = await supabase.from('email_send_log').insert({
      message_id: null,
      template_name: templateName,
      recipient_email: to,
      status,
      ...(error_message ? { error_message: error_message.slice(0, 1000) } : {}),
    })
    if (error) console.error('email_send_log insert failed', { code: error.code, message: error.message })
  }
  try {
    const result = await sendTemplateEmail(templateName, to, options)
    await log(result.sent ? 'sent' : 'suppressed')
    return result
  } catch (err) {
    await log('failed', err instanceof Error ? err.message : String(err))
    throw err
  }
}
