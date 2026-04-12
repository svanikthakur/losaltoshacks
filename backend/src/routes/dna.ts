/**
 * Founder DNA Profile — onboarding fields, persisted on the founders row.
 *   GET  /api/dna       → current DNA
 *   PUT  /api/dna       → update DNA
 */
import { Router } from 'express'
import { db } from '../db/index.js'
import { dnaFromFounder, computeDnaStrength } from '../services/dnaContext.js'

const router = Router()

router.get('/', async (req, res) => {
  const f = await db.getFounder(req.founderId!)
  if (!f) return res.status(404).json({ error: 'Not found' })
  const reports = await db.listReportsForFounder(f.id)
  const sessionCount = reports.filter((r) => r.status === 'complete').length
  const strength = computeDnaStrength(dnaFromFounder(f), sessionCount)
  res.json({
    skills: f.skills || [],
    riskScore: f.riskScore ?? 3,
    location: f.location || '',
    networkSize: f.networkSize ?? 0,
    hoursPerWeek: f.hoursPerWeek ?? 10,
    priorStartups: f.priorStartups ?? 0,
    industryFocus: f.industryFocus || '',
    tier: f.tier || 'founder',
    strength,
  })
})

router.put('/', async (req, res) => {
  const { skills, riskScore, location, networkSize, hoursPerWeek, priorStartups, industryFocus } = req.body || {}
  const patch: Record<string, unknown> = {}
  if (Array.isArray(skills)) patch.skills = skills
  if (Number.isInteger(riskScore) && riskScore >= 1 && riskScore <= 5) patch.riskScore = riskScore
  if (typeof location === 'string') patch.location = location
  if (Number.isFinite(networkSize)) patch.networkSize = networkSize
  if (Number.isFinite(hoursPerWeek)) patch.hoursPerWeek = hoursPerWeek
  if (Number.isFinite(priorStartups)) patch.priorStartups = priorStartups
  if (typeof industryFocus === 'string') patch.industryFocus = industryFocus
  const f = await db.updateFounder(req.founderId!, patch)
  if (!f) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
})

export default router
