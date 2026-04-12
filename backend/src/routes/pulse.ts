import { Router } from 'express'
import { db } from '../db/index.js'
import { callAgentJSON } from '../services/ai.js'
import { searchWeb } from '../services/serper.js'

const router = Router()

router.post('/market-pulse', async (req, res, next) => {
  try {
    const { reportId } = req.body || {}
    const r = await db.getReport(reportId)
    if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })

    const dateStr = new Date().toISOString().slice(0, 10)
    const searchResults = await searchWeb(`${r.ideaText} funding launch ${dateStr}`)

    const result = await callAgentJSON<{
      alerts: Array<{
        type: 'competitor_funding' | 'new_launch' | 'market_shift'
        title: string
        detail: string
        impact: 'positive' | 'negative' | 'neutral'
      }>
      collisionDelta: number
    }>(
      'scout',
      `You are a market intelligence analyst. Given recent search results about a startup idea, identify market signals and compare them against prior scout analysis. Produce alerts for competitor funding, new launches, or market shifts. Also compute a collisionDelta (-100 to +100) indicating how the competitive landscape has changed (negative = more crowded, positive = more opportunity). Return JSON: { "alerts": [{ "type": "competitor_funding"|"new_launch"|"market_shift", "title": string, "detail": string, "impact": "positive"|"negative"|"neutral" }], "collisionDelta": number }`,
      `Idea: ${r.ideaText}\nPrior scout analysis: ${JSON.stringify(r.scout_output || {})}\n\nRecent search results: ${JSON.stringify(searchResults)}`,
      { temperature: 0.3, timeoutMs: 60_000 },
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.get('/benchmarks/:reportId', async (req, res, next) => {
  try {
    const { reportId } = req.params
    const r = await db.getReport(reportId)
    if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })

    const allReports = await db.listAllReports()
    const scout = r.scout_output as Record<string, unknown> | undefined
    const category = (scout as any)?.category || 'general'

    const cohort = allReports.filter((rpt) => {
      if (rpt.status !== 'complete' || rpt.validationScore <= 0) return false
      const rptScout = rpt.scout_output as Record<string, unknown> | undefined
      return (rptScout as any)?.category === category
    })

    const scores = cohort.map((rpt) => rpt.validationScore).sort((a, b) => a - b)
    const cohortSize = scores.length
    const avgScore = cohortSize > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / cohortSize) * 10) / 10 : 0
    const topDecileScore = cohortSize > 0 ? scores[Math.floor(cohortSize * 0.9)] || scores[scores.length - 1] : 0

    let percentile = 0
    if (cohortSize > 0) {
      const below = scores.filter((s) => s < r.validationScore).length
      percentile = Math.round((below / cohortSize) * 100)
    }

    const insight =
      percentile >= 90
        ? `Top 10% in ${category} — strong validation signal.`
        : percentile >= 50
          ? `Above average in ${category}. Focus on weaknesses to break into the top decile.`
          : `Below median in ${category}. Consider pivoting or addressing key gaps.`

    res.json({
      score: r.validationScore,
      percentile,
      category,
      cohortSize,
      avgScore,
      topDecileScore,
      insight,
    })
  } catch (err) {
    next(err)
  }
})

export default router
