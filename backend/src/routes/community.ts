/**
 * Community routes — benchmarks + co-founder matches.
 * Phase 5 feature; routes shaped so frontend calls don't 404.
 */
import { Router } from 'express'

const router = Router()

router.get('/benchmarks', (_req, res) => {
  res.json({ benchmarks: [] })
})

router.get('/matches', (_req, res) => {
  res.json({ matches: [] })
})

export default router
