/**
 * Community intelligence — anonymous aggregate stats over all reports.
 *   GET /api/community/benchmarks → avg score, top decile, sample size
 *   GET /api/community/matches    → cofounder matches (proxied to /api/network/matches)
 */
import { Router } from 'express'
import { db } from '../db/index.js'

const router = Router()

router.get('/benchmarks', async (_req, res) => {
  const b = await db.communityBenchmarks()
  // Synthesize realistic distribution if community is sparse (<10 reports)
  if (b.sampleSize < 10) {
    res.json({
      avgScore: 6.2,
      topDecile: 8.7,
      sampleSize: b.sampleSize,
      synthetic: true,
    })
    return
  }
  res.json({ ...b, synthetic: false })
})

router.get('/matches', (_req, res) => {
  // Proxy to network/matches
  res.redirect(307, '/api/network/matches')
})

export default router
