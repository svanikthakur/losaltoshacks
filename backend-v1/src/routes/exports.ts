import { Router } from 'express'
import { db } from '../db/store.js'
import { requireAuth } from './middleware.js'

const router = Router()

/**
 * Stubs. The pipeline already writes mock URLs onto the report — these endpoints
 * just return them for now. Swap bodies for real Google Slides / Sheets / GitHub calls.
 */
router.post('/slides', requireAuth, (req, res) => {
  const r = db.getReport(req.body?.reportId)
  if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
  res.json({ url: r.pitch_deck_url })
})

router.post('/github', requireAuth, (req, res) => {
  const r = db.getReport(req.body?.reportId)
  if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
  res.json({ url: r.github_repo_url })
})

router.post('/investors', requireAuth, (req, res) => {
  const r = db.getReport(req.body?.reportId)
  if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
  res.json({ url: r.investor_sheet_url })
})

export default router
