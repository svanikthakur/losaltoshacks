/**
 * Pivot Engine — generates 5 ranked pivot directions for low-scoring ideas.
 * Real Ollama call (mistral). Personalized with operator DNA.
 */
import { callAgentJSON } from '../services/ai.js'
import { dnaContextBlock, type DNA } from '../services/dnaContext.js'
import type { ScoutOutput } from './Scout.js'
import type { AtlasOutput } from './Atlas.js'

export interface PivotIdea {
  rank: number
  pivotIdea: string
  newTargetMarket: string
  newCoreFeature: string
  estimatedScore: number
  whyLessCompetition: string
  marketSizeEst?: string
}

export interface PivotOutput {
  pivots: PivotIdea[]
}

const SYSTEM = `You are the Pivot Engine. Given a startup idea that scored low on validation,
generate 5 specific, viable pivot directions. Each must be a meaningful angle change,
not a small tweak. Return ONLY valid JSON:
{
  "pivots": [
    {
      "rank": number (1-5),
      "pivotIdea": string (one sentence — the new idea),
      "newTargetMarket": string (the new ICP),
      "newCoreFeature": string (what's the killer feature now),
      "estimatedScore": number (1-10 — your honest estimate of validation score),
      "whyLessCompetition": string (one sentence on why this angle is less crowded),
      "marketSizeEst": string (rough TAM estimate, e.g. "$1.2B")
    }
  ]
}
Rank pivots by descending estimatedScore. Be specific, not generic.`

export async function runPivot(
  idea: string,
  scout: ScoutOutput,
  atlas: AtlasOutput,
  dna: DNA,
): Promise<PivotOutput> {
  const user = `Original idea: "${idea}"

Original opportunity score: ${atlas.opportunityScore}/100
Demand level: ${scout.demandLevel}
Competitors: ${(scout.competitors || []).map((c) => c.name).join(', ')}
Customer segments: ${(atlas.customerSegments || []).map((s) => s.tier).join(', ')}
Headwinds: ${(atlas.headwinds || []).join(' | ')}

Generate 5 BETTER pivot angles that escape the existing competition.${dnaContextBlock(dna)}`

  return callAgentJSON<PivotOutput>('pivot', SYSTEM + dnaContextBlock(dna), user, {
    temperature: 0.5,
    timeoutMs: 60_000,
  })
}
