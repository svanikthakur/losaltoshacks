/**
 * Pivot engine — generates 5 alternate angles for a low-scoring idea.
 * Phase 4 feature; stubbed with a canned response shape.
 */
import { Router } from 'express'
import { db } from '../db/index.js'

const router = Router()

router.post('/generate', async (req, res) => {
  const { reportId } = req.body || {}
  const r = await db.getReport(reportId)
  if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
  const pivots = (r.atlas_output as { pivots?: string[] } | undefined)?.pivots || []
  res.json({
    pivots: pivots.map((p, i) => ({
      rank: i + 1,
      pivotIdea: p,
      marketSizeEst: null,
      competitorGap: null,
      pitchAngle: null,
    })),
  })
})

export default router
