/**
 * Trends route — Serper + Google Trends passthrough.
 */
import { Router } from 'express'
import { searchWeb } from '../services/serper.js'
import { getTrends } from '../services/trends.js'

const router = Router()

router.get('/:idea', async (req, res) => {
  const idea = req.params.idea
  const [results, trends] = await Promise.all([searchWeb(idea, 6), getTrends(idea)])
  res.json({
    trends,
    topKeywords: results.map((r) => r.title).slice(0, 6),
    collisionScore: Math.min(10, results.length),
  })
})

export default router
