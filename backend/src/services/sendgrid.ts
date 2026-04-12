/**
 * SendGrid wrapper. Sends real cold outreach emails with an inline tracking pixel.
 * Free tier: 100 emails/day.
 *
 * Tracking pixel hits GET /api/track/:token/open which updates email_tracking.opened_at.
 */
import sgMail from '@sendgrid/mail'

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export interface SendArgs {
  to: string
  subject: string
  bodyHtml: string
  trackingToken: string
  trackingBase?: string
  /** Threaded back through the SendGrid webhook as event.custom_args */
  customArgs?: Record<string, string>
}

export async function sendOutreach(args: SendArgs): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.SENDGRID_API_KEY) return { ok: false, error: 'SENDGRID_API_KEY not set' }
  if (!process.env.SENDGRID_FROM_EMAIL) return { ok: false, error: 'SENDGRID_FROM_EMAIL not set' }

  const trackingBase = args.trackingBase || process.env.TRACKING_BASE || 'http://localhost:4000'
  const pixel = `<img src="${trackingBase}/api/track/${args.trackingToken}/open" width="1" height="1" alt="" style="display:none" />`

  // Simple wrapper template — looks like a real cold email, not marketing spam
  const wrappedHtml = `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;line-height:1.6;max-width:600px;margin:0;padding:20px">
${args.bodyHtml}
${pixel}
</body></html>`

  try {
    console.log(`[sendgrid] sending to=${args.to} subject="${args.subject.slice(0, 50)}" from=${process.env.SENDGRID_FROM_EMAIL}`)
    const [response] = await sgMail.send({
      to: args.to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME || 'AgentConnect',
      },
      subject: args.subject,
      html: wrappedHtml,
      customArgs: {
        tracking_token: args.trackingToken,
        ...(args.customArgs || {}),
      },
      trackingSettings: {
        clickTracking: { enable: true, enableText: false },
        openTracking: { enable: true },
      },
    })
    console.log(`[sendgrid] ✓ accepted · status=${response.statusCode} to=${args.to}`)
    return { ok: true }
  } catch (err: any) {
    const msg = err?.response?.body?.errors?.[0]?.message || err?.message || 'sendgrid failed'
    const status = err?.code || err?.response?.statusCode || '?'
    console.error(`[sendgrid] ✗ failed · status=${status} to=${args.to} error="${msg}"`)
    return { ok: false, error: msg }
  }
}
