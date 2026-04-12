/**
 * Investors routes — real SendGrid send + real tracking + dynamic re-ranking.
 *
 *   POST /api/investors/match          { reportId }       → VC list with drafts
 *   POST /api/investors/outreach       { reportId, vcId } → sends the draft, creates tracking row
 *   GET  /api/investors/tracking/:id   → raw tracking rows for a report
 *   GET  /api/investors/ranked/:id     → VCs re-ranked by engagement × compatibility
 */
import { Router } from 'express'
import { db } from '../db/index.js'
import { sendOutreach } from '../services/sendgrid.js'
import type { ConnectInvestor, ConnectOutput } from '../agents/Connect.js'

const router = Router()

function connectOut(r: { connect_output?: unknown }): ConnectOutput | null {
  return (r.connect_output || null) as ConnectOutput | null
}

router.post('/match', async (req, res) => {
  const { reportId } = req.body || {}
  const r = await db.getReport(reportId)
  if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
  const c = connectOut(r)
  res.json({ investors: c?.topVCs || [] })
})

router.post('/outreach', async (req, res, next) => {
  try {
    const { reportId, vcId } = req.body || {}
    const r = await db.getReport(reportId)
    if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })

    const c = connectOut(r)
    const vcs = c?.topVCs || []
    const vc = vcs.find((i) => i.id === vcId) as ConnectInvestor | undefined
    if (!vc) return res.status(404).json({ error: 'VC not found in report' })
    if (!vc.email) return res.status(400).json({ error: 'VC has no email on file' })

    // Record the VC as a match so we have a stable id to key tracking against
    const matches = await db.insertVcMatches(reportId, [
      {
        vcName: vc.name,
        firm: vc.firm,
        email: vc.email,
        compatibilityScore: vc.compatibilityScore ?? 50,
        thesisMatch: vc.thesisMatch,
      },
    ])
    const newMatch = matches[0]
    const tracking = await db.createEmailTracking(newMatch.id)

    // Plain-text body → HTML paragraphs
    const bodyHtml = (vc.draftEmail?.body || '')
      .split(/\n\n+/)
      .map((p: string) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
      .join('')

    const result = await sendOutreach({
      to: vc.email,
      subject: vc.draftEmail?.subject || `Quick intro from ${r.ideaText.slice(0, 50)}`,
      bodyHtml,
      trackingToken: tracking.trackingToken,
      customArgs: {
        report_id: reportId,
        vc_match_id: newMatch.id,
        vc_id: vc.id,
      },
    })

    if (!result.ok) {
      return res.status(502).json({ error: result.error })
    }

    await db.updateVcMatch(newMatch.id, { outreachSentAt: Date.now() })
    res.json({ ok: true, matchId: newMatch.id, trackingToken: tracking.trackingToken })
  } catch (err) {
    next(err)
  }
})

router.get('/tracking/:reportId', async (req, res) => {
  const r = await db.getReport(req.params.reportId)
  if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
  const matches = await db.listVcMatches(req.params.reportId)
  const tracking = await db.listEmailTrackingForReport(req.params.reportId)
  res.json({ matches, tracking })
})

/**
 * Dynamic re-ranking — merges the static compatibilityScore with a live
 * engagement bonus computed from email_tracking (open → +10, click → +20,
 * second click → +5 each, delivered → +2). VCs who haven't been contacted
 * yet keep their original compatibility score.
 */
router.get('/ranked/:reportId', async (req, res) => {
  const r = await db.getReport(req.params.reportId)
  if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })

  const c = connectOut(r)
  const vcs = c?.topVCs || []
  const matches = await db.listVcMatches(req.params.reportId)
  const tracking = await db.listEmailTrackingForReport(req.params.reportId)

  // Build an engagement lookup keyed by email (matches vcs[i].email)
  const trackingByMatchId = new Map(tracking.map((t) => [t.vcMatchId, t]))
  const engagementByEmail = new Map<string, ReturnType<typeof buildEngagement>>()
  for (const m of matches) {
    const t = trackingByMatchId.get(m.id)
    if (!t || !m.email) continue
    engagementByEmail.set(m.email.toLowerCase(), buildEngagement(t, m.outreachSentAt))
  }

  const ranked = vcs.map((vc) => {
    const eng = vc.email ? engagementByEmail.get(vc.email.toLowerCase()) : undefined
    const base = vc.compatibilityScore ?? 50
    const bonus = eng?.bonus ?? 0
    return {
      ...vc,
      engagement: eng || null,
      effectiveScore: Math.min(100, base + bonus),
    }
  })

  ranked.sort((a, b) => b.effectiveScore - a.effectiveScore)
  res.json({ ranked })
})

function buildEngagement(
  t: { openedAt?: number; openCount?: number; clickedAt?: number; clickCount?: number; deliveredAt?: number; bouncedAt?: number },
  sentAt?: number,
) {
  let bonus = 0
  const stages: string[] = []
  if (sentAt) stages.push('sent')
  if (t.deliveredAt) {
    stages.push('delivered')
    bonus += 2
  }
  if (t.bouncedAt) {
    stages.push('bounced')
    bonus -= 20
  }
  if (t.openedAt) {
    stages.push('opened')
    bonus += 10
    if ((t.openCount || 1) > 1) bonus += Math.min(5, (t.openCount || 1) - 1)
  }
  if (t.clickedAt) {
    stages.push('clicked')
    bonus += 20
    if ((t.clickCount || 1) > 1) bonus += Math.min(10, ((t.clickCount || 1) - 1) * 5)
  }
  return {
    bonus,
    stages,
    sentAt: sentAt || null,
    deliveredAt: t.deliveredAt || null,
    openedAt: t.openedAt || null,
    clickedAt: t.clickedAt || null,
    bouncedAt: t.bouncedAt || null,
    openCount: t.openCount || 0,
    clickCount: t.clickCount || 0,
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export default router
