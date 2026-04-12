/**
 * Investor Feedback Simulator — roleplays a skeptical Series A VC.
 *
 * Two modes:
 *   generateQuestions(idea, scout, atlas, dna)
 *      → returns 5 brutal questions + scoring rubric
 *   scoreAnswers(questions, answers, dna)
 *      → returns per-answer score + feedback + final readiness score
 */
import { callAgentJSON } from '../services/ai.js'
import { dnaContextBlock, type DNA } from '../services/dnaContext.js'
import type { ScoutOutput } from './Scout.js'
import type { AtlasOutput } from './Atlas.js'

export interface StressTestQuestion {
  q: string
  rubric: string
}

export interface StressTestAnswer {
  a: string
  score: number
  feedback: string
}

export interface StressTestResult {
  answers: StressTestAnswer[]
  finalScore: number
  summary: string
}

const QUESTION_SYSTEM = `You are a skeptical Series A VC partner doing diligence on a startup pitch.
Ask 5 brutal, specific questions that get to the weakest parts of the idea. No softballs.
Return ONLY JSON:
{
  "questions": [
    { "q": string, "rubric": string (what a great answer looks like) }
  ]
}
Cover: market size honesty, defensibility, GTM credibility, competitive moat, founder fit.`

const SCORE_SYSTEM = `You are a skeptical Series A VC scoring a founder's answers to your stress test.
Be honest. Score each answer 1-10 against the rubric. Return ONLY JSON:
{
  "answers": [
    { "a": string (echo of the answer), "score": number (1-10), "feedback": string }
  ],
  "finalScore": number (1-100, weighted average × 10),
  "summary": string (one paragraph: would you take a meeting?)
}
Most founders score 30-65. Reserve 80+ for genuinely investable answers.`

export async function generateStressQuestions(
  idea: string,
  scout: ScoutOutput,
  atlas: AtlasOutput,
  dna: DNA,
): Promise<{ questions: StressTestQuestion[] }> {
  const user = `Idea: "${idea}"
TAM: ${atlas.tam} · opportunity ${atlas.opportunityScore}/100
Competitors: ${(scout.competitors || []).map((c) => c.name).join(', ')}
Launch region: ${atlas.launchRegion}
Early adopters: ${atlas.customerSegments?.[0]?.description || ''}${dnaContextBlock(dna)}

Ask the 5 brutal questions you'd ask in a partner meeting.`

  return callAgentJSON<{ questions: StressTestQuestion[] }>(
    'simulator',
    QUESTION_SYSTEM + dnaContextBlock(dna),
    user,
    { temperature: 0.4, timeoutMs: 60_000 },
  )
}

export async function scoreStressAnswers(
  idea: string,
  questions: StressTestQuestion[],
  rawAnswers: string[],
  dna: DNA,
): Promise<StressTestResult> {
  const pairs = questions
    .map((q, i) => `Q${i + 1}: ${q.q}\nRubric: ${q.rubric}\nAnswer: ${rawAnswers[i] || '(no answer)'}`)
    .join('\n\n')

  const user = `Idea: "${idea}"

${pairs}${dnaContextBlock(dna)}

Score each answer and give a final readiness score 1-100.`

  return callAgentJSON<StressTestResult>(
    'simulator',
    SCORE_SYSTEM + dnaContextBlock(dna),
    user,
    { temperature: 0.3, timeoutMs: 60_000 },
  )
}
