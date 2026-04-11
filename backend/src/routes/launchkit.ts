/**
 * One-click launch kit route.
 *   POST /api/launchkit/generate { reportId } → domains/logo/landingHtml/waitlistEmbed
 */
import { Router } from 'express'
import { db } from '../db/index.js'
import { runLaunchKit } from '../agents/LaunchKit.js'
import { dnaFromFounder } from '../services/dnaContext.js'
import type { ScoutOutput } from '../agents/Scout.js'
import type { AtlasOutput } from '../agents/Atlas.js'

const router = Router()

router.post('/generate', async (req, res, next) => {
  try {
    const { reportId } = req.body || {}
    const r = await db.getReport(reportId)
    if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
    if (!r.scout_output || !r.atlas_output) return res.status(400).json({ error: 'Report not ready' })
    const founder = await db.getFounder(req.founderId!)
    const dna = dnaFromFounder(founder)
    const out = await runLaunchKit(
      r.ideaText,
      r.scout_output as ScoutOutput,
      r.atlas_output as AtlasOutput,
      dna,
    )
    res.json(out)
  } catch (err) {
    next(err)
  }
})

export default router
