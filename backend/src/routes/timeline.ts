/**
 * Fundraising timeline route.
 *   POST /api/timeline/generate { reportId, stage } → 12-week roadmap
 */
import { Router } from 'express'
import { db } from '../db/index.js'
import { runTimeline } from '../agents/Timeline.js'
import { dnaFromFounder } from '../services/dnaContext.js'
import type { AtlasOutput } from '../agents/Atlas.js'

const router = Router()

router.post('/generate', async (req, res, next) => {
  try {
    const { reportId, stage } = req.body || {}
    const r = await db.getReport(reportId)
    if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
    if (!r.atlas_output) return res.status(400).json({ error: 'Report not ready' })
    const founder = await db.getFounder(req.founderId!)
    const dna = dnaFromFounder(founder)
    const out = await runTimeline(r.ideaText, stage || 'mvp', r.atlas_output as AtlasOutput, dna)
    res.json(out)
  } catch (err) {
    next(err)
  }
})

export default router
