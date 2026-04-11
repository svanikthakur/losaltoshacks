import { Router } from 'express'
import { db } from '../db/store.js'
import { requireAuth } from './middleware.js'

const router = Router()

router.get('/profile', requireAuth, (req, res) => {
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

router.patch('/profile', requireAuth, (req, res) => {
  const { skills, location, industryFocus, riskTolerance } = req.body || {}
  const f = db.updateFounder(req.founderId!, { skills, location, industryFocus, riskTolerance })
  if (!f) return res.status(404).json({ error: 'Not found' })
  res.json(f)
})

router.get('/validations', requireAuth, (req, res) => {
  const reports = db.listReportsForFounder(req.founderId!)
  res.json(reports)
})

export default router
