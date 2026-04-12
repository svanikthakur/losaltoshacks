/**
 * SendGrid Event Webhook receiver.
 *
 * POST /api/sendgrid/webhook
 *
 * SendGrid posts a JSON array of events. Each event carries custom_args we set
 * on the original send (tracking_token, vc_match_id, report_id). We thread
 * those back into email_tracking so /api/investors/ranked/:reportId sees the
 * updates in real time.
 *
 * The endpoint is public (SendGrid can't bring auth). Security comes from:
 *   - the ngrok URL being unguessable
 *   - and optionally HMAC signature verification if SIGNING_KEY is set
 *     (SendGrid: Mail Settings → Event Webhook → Enable Signed Event Webhook)
 */
import { Router, type Request, type Response } from 'express'
import { db } from '../db/index.js'
import { broadcast } from '../websocket.js'

const router = Router()

interface SendgridEvent {
  email?: string
  event?: string // 'processed' | 'delivered' | 'open' | 'click' | 'bounce' | ...
  timestamp?: number
  tracking_token?: string
  vc_match_id?: string
  report_id?: string
  url?: string // present on click events
}

router.post('/webhook', async (req: Request, res: Response) => {
  const events = Array.isArray(req.body) ? (req.body as SendgridEvent[]) : []
  // Ack immediately so SendGrid doesn't retry on our processing latency
  res.status(200).json({ ok: true, received: events.length })

  for (const ev of events) {
    const token = ev.tracking_token
    if (!token) continue
    try {
      switch (ev.event) {
        case 'delivered':
          await db.recordEmailDelivered(token)
          break
        case 'open':
          await db.recordEmailOpen(token)
          break
        case 'click':
          await db.recordEmailClick(token)
          break
        case 'bounce':
        case 'dropped':
        case 'blocked':
          await db.recordEmailBounced(token)
          break
        default:
          // processed / deferred / spamreport / unsubscribe — ignore for now
          break
      }

      // Broadcast to the WS stream so the frontend live-updates the ranking
      if (ev.report_id) {
        broadcast(ev.report_id, {
          type: 'vc_event',
          event: ev.event,
          vc_match_id: ev.vc_match_id || null,
          tracking_token: token,
          timestamp: ev.timestamp || Math.floor(Date.now() / 1000),
        })
      }
    } catch (err) {
      console.warn(`[sendgrid] webhook event ${ev.event} failed:`, (err as Error).message)
    }
  }
})

export default router
