/**
 * Report routes.
 *   POST /generate       -> { reportId }, schedules pipeline
 *   GET  /:id            -> full report shape with all agent outputs
 *   GET  /:id/score      -> { score, history: score_history[] }
 */
import { Router } from 'express'
import { db } from '../db/index.js'
import { schedulePipeline } from '../queue/pipeline.js'

const router = Router()

router.post('/generate', (req, res) => {
  const { idea } = req.body || {}
  if (!idea || typeof idea !== 'string') {
    return res.status(400).json({ error: 'idea required' })
  }
  const r = db.createReport({ founderId: req.founderId!, ideaText: idea })
  schedulePipeline(r.id)
  res.json({ reportId: r.id })
})

router.get('/:id', (req, res) => {
  const r = db.getReport(req.params.id)
  if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
  // Expose the fields the frontend Report.tsx expects.
  res.json({
    id: r.id,
    idea: r.ideaText,
    category: null,
    status: r.status,
    validation_score: r.validationScore,
    scout_output: r.scout_output,
    atlas_output: r.atlas_output,
    forge_output: r.forge_output,
    deck_output: r.deck_output,
    connect_output: r.connect_output,
    pdf_report_url: r.pdf_report_url,
    pitch_deck_url: r.pitch_deck_url,
    github_repo_url: r.github_repo_url,
    investor_sheet_url: r.investor_sheet_url,
    deck_url: r.deck_url,
    notion_url: r.notion_url,
    createdAt: r.createdAt,
  })
})

router.get('/:id/score', (req, res) => {
  const r = db.getReport(req.params.id)
  if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
  res.json({
    score: r.validationScore,
    history: db.listScoreHistory(r.id),
  })
})

export default router
