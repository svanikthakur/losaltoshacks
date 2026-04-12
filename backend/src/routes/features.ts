import { Router } from 'express'
import { db } from '../db/index.js'
import { callAgentJSON } from '../services/ai.js'
import { searchWeb } from '../services/serper.js'

const router = Router()

router.post('/ab-headlines', async (req, res, next) => {
  try {
    const { reportId } = req.body || {}
    const r = await db.getReport(reportId)
    if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
    if (!r.deck_output || !r.atlas_output) {
      return res.status(400).json({ error: 'Report not ready (Deck + Atlas required)' })
    }

    const deck = r.deck_output as Record<string, unknown>
    const atlas = r.atlas_output as Record<string, unknown>

    const result = await callAgentJSON<{
      headlines: Array<{
        text: string
        clarityScore: number
        investorAppeal: number
        memorability: number
        totalScore: number
      }>
    }>(
      'deck',
      `You are a pitch copywriting expert. Given a startup one-liner and market context, generate exactly 5 one-liner pitch variations. For each, score clarity (1-10), investor appeal (1-10), and memorability (1-10), then compute totalScore as the average. Return JSON: { "headlines": [{ "text", "clarityScore", "investorAppeal", "memorability", "totalScore" }] }`,
      `Current one-liner: ${JSON.stringify((deck as any).oneLiner || r.ideaText)}\n\nMarket context: ${JSON.stringify(atlas)}`,
      { temperature: 0.5, timeoutMs: 60_000 },
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/revenue-models', async (req, res, next) => {
  try {
    const { reportId } = req.body || {}
    const r = await db.getReport(reportId)
    if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
    if (!r.atlas_output) {
      return res.status(400).json({ error: 'Report not ready (Atlas required)' })
    }

    const result = await callAgentJSON<{
      models: Array<{
        type: 'saas' | 'marketplace' | 'usage' | 'freemium' | 'enterprise'
        description: string
        pricingTiers: string[]
        projectedMrr: { at100: string; at1000: string; at10000: string }
        pros: string[]
        cons: string[]
      }>
    }>(
      'forge',
      `You are a startup monetization strategist. Given a startup idea and market analysis, generate exactly 5 monetization models. Each must have type (one of: saas, marketplace, usage, freemium, enterprise), description, pricingTiers (array of tier descriptions), projectedMrr with keys at100/at1000/at10000 (string dollar amounts for those customer counts), pros, and cons. Return JSON: { "models": [...] }`,
      `Idea: ${r.ideaText}\n\nMarket analysis: ${JSON.stringify(r.atlas_output)}`,
      { temperature: 0.4, timeoutMs: 60_000 },
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/competitor-deepdive', async (req, res, next) => {
  try {
    const { reportId, competitorName } = req.body || {}
    if (!competitorName) return res.status(400).json({ error: 'competitorName required' })
    const r = await db.getReport(reportId)
    if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })

    const [pricingResults, reviewResults, complaintResults] = await Promise.all([
      searchWeb(`${competitorName} pricing`),
      searchWeb(`${competitorName} reviews`),
      searchWeb(`${competitorName} complaints`),
    ])

    const searchContext = {
      pricing: pricingResults,
      reviews: reviewResults,
      complaints: complaintResults,
    }

    const result = await callAgentJSON<{
      name: string
      pricing: string
      weaknesses: string[]
      customerComplaints: string[]
      positioningAdvice: string
    }>(
      'scout',
      `You are a competitive intelligence analyst. Given search results about a competitor, produce a deep-dive analysis. Return JSON: { "name": string, "pricing": string (summary of their pricing), "weaknesses": string[], "customerComplaints": string[], "positioningAdvice": string (how the founder should position against them) }`,
      `Competitor: ${competitorName}\nOur idea: ${r.ideaText}\n\nSearch results: ${JSON.stringify(searchContext)}`,
      { temperature: 0.3, timeoutMs: 60_000 },
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/due-diligence', async (req, res, next) => {
  try {
    const { reportId } = req.body || {}
    const r = await db.getReport(reportId)
    if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })

    const result = await callAgentJSON<{
      items: Array<{
        category: string
        item: string
        status: 'pending' | 'done'
        canGenerate: boolean
      }>
    }>(
      'connect',
      `You are an investor due diligence expert. Given a startup report, generate a comprehensive due diligence checklist that investors would want to see. Categories must be: legal, financial, product, market, team. Each item has a status (default "pending") and canGenerate (true if our AI agents can help generate/complete this item). Return JSON: { "items": [{ "category", "item", "status", "canGenerate" }] }`,
      `Idea: ${r.ideaText}\nValidation score: ${r.validationScore}\nScout: ${JSON.stringify(r.scout_output || {})}\nAtlas: ${JSON.stringify(r.atlas_output || {})}`,
      { temperature: 0.3, timeoutMs: 60_000 },
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/sprint-plan', async (req, res, next) => {
  try {
    const { reportId } = req.body || {}
    const r = await db.getReport(reportId)
    if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })
    if (!r.forge_output) {
      return res.status(400).json({ error: 'Report not ready (Forge required)' })
    }

    const result = await callAgentJSON<{
      weeks: Array<{
        week: number
        theme: string
        tasks: Array<{ task: string; timeEstimate: string; guide: string }>
      }>
    }>(
      'forge',
      `You are a startup execution coach. Given a startup idea and its technical blueprint, create a 30-day execution sprint broken into 4 weeks. Each week has a theme and 3-5 tasks with time estimates and brief guides. Return JSON: { "weeks": [{ "week": number, "theme": string, "tasks": [{ "task", "timeEstimate", "guide" }] }] }`,
      `Idea: ${r.ideaText}\nBlueprint: ${JSON.stringify(r.forge_output)}`,
      { temperature: 0.4, timeoutMs: 60_000 },
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/cofounder-sim/start', async (req, res, next) => {
  try {
    const { reportId, role } = req.body || {}
    if (!role || !['technical', 'business'].includes(role)) {
      return res.status(400).json({ error: 'role must be "technical" or "business"' })
    }
    const r = await db.getReport(reportId)
    if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })

    const result = await callAgentJSON<{
      questions: Array<{ q: string; context: string }>
    }>(
      'simulator',
      `You are simulating a tough ${role} co-founder evaluating a startup idea. Generate exactly 5 hard, probing questions that a ${role} co-founder would ask before committing. Each question should have context explaining why it matters. Return JSON: { "questions": [{ "q": string, "context": string }] }`,
      `Idea: ${r.ideaText}\nScout: ${JSON.stringify(r.scout_output || {})}\nAtlas: ${JSON.stringify(r.atlas_output || {})}`,
      { temperature: 0.5, timeoutMs: 60_000 },
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/cofounder-sim/score', async (req, res, next) => {
  try {
    const { reportId, questions, answers } = req.body || {}
    if (!questions || !answers) {
      return res.status(400).json({ error: 'questions and answers required' })
    }
    const r = await db.getReport(reportId)
    if (!r || r.founderId !== req.founderId) return res.status(404).json({ error: 'Not found' })

    const qa = (questions as Array<{ q: string; context: string }>).map(
      (q: { q: string; context: string }, i: number) => ({
        question: q.q,
        context: q.context,
        answer: (answers as string[])[i] || '',
      }),
    )

    const result = await callAgentJSON<{
      scores: Array<{ score: number; feedback: string }>
      overallScore: number
      verdict: string
    }>(
      'simulator',
      `You are a co-founder evaluator. Score each answer on a scale of 1-10. Provide specific feedback on each answer and an overall score (average). The verdict should be a 1-2 sentence summary of whether you'd join as co-founder. Return JSON: { "scores": [{ "score": number, "feedback": string }], "overallScore": number, "verdict": string }`,
      `Idea: ${r.ideaText}\n\nQ&A:\n${JSON.stringify(qa)}`,
      { temperature: 0.3, timeoutMs: 60_000 },
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/warm-intro', async (_req, res) => {
  res.status(501).json({ error: 'Coming soon — requires LinkedIn OAuth / browser audio' })
})

router.post('/voice-coach', async (req, res, next) => {
  try {
    const { reportId, transcript } = req.body || {}
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 10) {
      return res.status(400).json({ error: 'transcript required (min 10 chars)' })
    }
    const r = reportId ? await db.getReport(reportId) : null
    const ideaContext = r ? `The startup idea: "${r.ideaText}"` : ''

    const result = await callAgentJSON<{
      clarityScore: number
      confidenceScore: number
      structureScore: number
      overallScore: number
      feedback: string
      lineByLine: string[]
    }>(
      'voice-coach',
      `You are a pitch coach scoring a founder's spoken elevator pitch.
Score on three axes (1-10 each):
- clarity: how clear and jargon-free is the message?
- confidence: does the speaker sound certain and commanding?
- structure: does the pitch follow problem → solution → traction → ask?

Return ONLY JSON:
{
  "clarityScore": number (1-10),
  "confidenceScore": number (1-10),
  "structureScore": number (1-10),
  "overallScore": number (1-10, weighted average),
  "feedback": string (2-3 sentences — what worked, what didn't),
  "lineByLine": string[] (3-5 specific suggestions keyed to phrases from the transcript)
}
Be honest. Most founders score 4-6. Reserve 8+ for genuinely polished pitches.`,
      `${ideaContext}

Here is the founder's spoken pitch transcript (recorded via browser speech recognition):

"${transcript}"

Score this pitch.`,
      { temperature: 0.3, timeoutMs: 30_000 },
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
