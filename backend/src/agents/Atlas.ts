/**
 * Atlas — market sizing agent.
 * Consumes Scout's output + the raw idea, returns TAM/SAM/SOM + a validation score 1–10.
 */
import { callAgentJSON } from '../services/ai.js'
import type { ScoutOutput } from './Scout.js'

export interface AtlasOutput {
  tam: string
  sam: string
  som: string
  topRegions: string[]
  marketGrowthRate: string
  timeToMonetize: string
  revenueModel: string
  validationScore: number // 1-10
  summary: string
  // Frontend-compat fields
  icp: string
  competitors: Array<{ name: string; weakness: string }>
  gtm: string
  pivots: string[]
}

const SYSTEM = `You are Atlas, a market sizing agent. Think like a VC analyst.
Given an idea and Scout's market intelligence dispatch, size the opportunity bottom-up.
Return ONLY valid JSON (no markdown) with this shape:
{
  "tam": string (e.g. "$12.4B"),
  "sam": string (e.g. "$2.1B"),
  "som": string (e.g. "$84M"),
  "topRegions": string[],
  "marketGrowthRate": string,
  "timeToMonetize": string,
  "revenueModel": string,
  "validationScore": number (1-10 integer),
  "summary": string,
  "icp": string (one-sentence ideal customer profile),
  "competitors": [{"name": string, "weakness": string}],
  "gtm": string (one-sentence go-to-market thesis),
  "pivots": string[] (3-5 alternate angles)
}
Be realistic — small markets get small numbers. Back your score with reasoning in the summary.`

export async function runAtlas(idea: string, scout: ScoutOutput): Promise<AtlasOutput> {
  const user = `Idea: "${idea}"

Scout dispatch:
${JSON.stringify(scout, null, 2)}

Size this market bottom-up. Give a realistic TAM/SAM/SOM and a validation score (1-10) grounded in the Scout data.`

  return callAgentJSON<AtlasOutput>('atlas', SYSTEM, user, { temperature: 0.3, timeoutMs: 90_000 })
}
