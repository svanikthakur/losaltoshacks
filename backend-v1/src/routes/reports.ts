import { Router } from 'express'
import { db } from '../db/store.js'
import { requireAuth } from './middleware.js'
import { runPipeline } from '../agents/pipeline.js'

const router = Router()

router.post('/generate', requireAuth, (req, res) => {
  const { idea, category } = req.body || {}
  if (!idea || typeof idea !== 'string') return res.status(400).json({ error: 'idea required' })
  const report = db.createReport({ founderId: req.founderId!, idea, category })

  // Fire and forget. The client subscribes via WS /ws/agent/:id for live updates.
  // Give the client a beat to open its socket before events start flying.
  setTimeout(() => runPipeline(report.id), 400)

  res.json({ reportId: report.id })
})

router.get('/:id', requireAuth, (req, res) => {
  const r = db.getReport(req.params.id)
  if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
  res.json(r)
})

export default router
