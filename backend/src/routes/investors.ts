/**
 * Investors routes. Phase 2 — match + outreach + tracking.
 * Current shape: reads from the connect_output already stashed on the report.
 */
import { Router } from 'express'
import { db } from '../db/index.js'

const router = Router()

router.post('/match', (req, res) => {
  const { reportId } = req.body || {}
  const r = db.getReport(reportId)
  if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
  const investors = (r.connect_output as { investors?: unknown[] } | undefined)?.investors || []
  res.json({ investors })
})

router.post('/outreach', (_req, res) => {
  res.status(501).json({ error: 'Phase 2: outreach not yet implemented' })
})

router.get('/tracking/:reportId', (req, res) => {
  const r = db.getReport(req.params.reportId)
  if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
  res.json({ tracking: db.listEmailTrackingForReport(r.id) })
})

export default router
