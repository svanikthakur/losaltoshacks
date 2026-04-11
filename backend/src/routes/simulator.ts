/**
 * Investor Feedback Simulator routes.
 *   POST /api/simulator/start    { reportId } → 5 questions
 *   POST /api/simulator/score    { reportId, questions, answers } → scored result + saved session
 *   GET  /api/simulator/:reportId → list sessions
 */
import { Router } from 'express'
import { db } from '../db/index.js'
import { generateStressQuestions, scoreStressAnswers } from '../agents/Simulator.js'
import { dnaFromFounder } from '../services/dnaContext.js'
import type { ScoutOutput } from '../agents/Scout.js'
import type { AtlasOutput } from '../agents/Atlas.js'

const router = Router()

router.post('/start', async (req, res, next) => {
  try {
    const { reportId } = req.body || {}
    const r = await db.getReport(reportId)
    if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
    if (!r.scout_output || !r.atlas_output) {
      return res.status(400).json({ error: 'Report not ready' })
    }
    const founder = await db.getFounder(req.founderId!)
    const dna = dnaFromFounder(founder)
    const out = await generateStressQuestions(
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

router.post('/score', async (req, res, next) => {
  try {
    const { reportId, questions, answers } = req.body || {}
    const r = await db.getReport(reportId)
    if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
    const founder = await db.getFounder(req.founderId!)
    const dna = dnaFromFounder(founder)
    const result = await scoreStressAnswers(r.ideaText, questions, answers, dna)
    const session = await db.createSimulatorSession({
      reportId,
      questions,
      answers: result.answers,
      finalScore: result.finalScore,
    })
    res.json({ ...result, sessionId: session.id })
  } catch (err) {
    next(err)
  }
})

router.get('/:reportId', async (req, res) => {
  const r = await db.getReport(req.params.reportId)
  if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
  const sessions = await db.listSimulatorSessions(req.params.reportId)
  res.json({ sessions })
})

export default router
