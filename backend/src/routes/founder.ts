/**
 * Founder profile + archive routes.
 *   GET   /profile         -> raw founder shape for the frontend
 *   PATCH /profile         -> updated shape
 *   GET   /validations     -> list of reports
 */
import { Router } from 'express'
import { db } from '../db/index.js'

const router = Router()

router.get('/profile', (req, res) => {
  const f = db.getFounder(req.founderId!)
  if (!f) return res.status(404).json({ error: 'Not found' })
  res.json({
    id: f.id,
    email: f.email,
    name: f.name,
    skills: f.skills,
    location: f.location,
    industryFocus: f.industryFocus,
    riskTolerance: f.riskTolerance,
  })
})

router.patch('/profile', (req, res) => {
  const { skills, location, industryFocus, riskTolerance } = req.body || {}
  const f = db.updateFounder(req.founderId!, { skills, location, industryFocus, riskTolerance })
  if (!f) return res.status(404).json({ error: 'Not found' })
  res.json(f)
})

router.get('/validations', (req, res) => {
  const rs = db.listReportsForFounder(req.founderId!)
  // Expose as the shape the frontend already renders
  res.json(
    rs.map((r) => ({
      id: r.id,
      idea: r.ideaText,
      category: null,
      status: r.status,
      validation_score: r.validationScore,
      createdAt: r.createdAt,
    })),
  )
})

export default router
