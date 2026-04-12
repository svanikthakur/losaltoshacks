/**
 * Atlas — global market sizing + opportunity mapping.
 *
 * STANDALONE: takes only the idea (and optional founder DNA). Does NOT depend
 * on Scout's output, so it can run in parallel with Scout in the pipeline.
 */
import { callAgentJSON } from '../services/ai.js'
import { dnaContextBlock, type DNA } from '../services/dnaContext.js'

export interface RegionEntry {
  name: string
  why: string
}

export interface CustomerSegment {
  tier: 'early adopters' | 'early majority' | 'late majority'
  description: string
  size: string
  acquisitionChannel: string
}

export interface AtlasOutput {
  /* Market sizing */
  tam: string
  sam: string
  som: string
  marketSizingRationale: string

  /* Geo */
  topRegions: [RegionEntry, RegionEntry, RegionEntry] // exactly 3
  launchRegion: string

  /* Customers */
  customerSegments: CustomerSegment[]

  /* Macro */
  tailwinds: [string, string, string] // exactly 3
  headwinds: [string, string, string] // exactly 3

  /* Score */
  opportunityScore: number // 0-100

  /* Verdict */
  summary: string
}

const SYSTEM = `You are Atlas, a global market sizing and opportunity mapping agent.

Given a startup idea, return a deep market sizing report with regional opportunity and customer segmentation.
You receive ONLY the idea (and optionally a founder DNA profile) — no upstream research.

Return ONLY valid JSON:
{
  "tam": string (e.g. "$12.4B"),
  "sam": string,
  "som": string,
  "marketSizingRationale": string (2-3 sentences explaining the bottom-up math),

  "topRegions": [
    { "name": string, "why": string (one sentence) }
  ] (exactly 3),
  "launchRegion": string (the single best region to launch in, with one-sentence reasoning),

  "customerSegments": [
    {
      "tier": "early adopters" | "early majority" | "late majority",
      "description": string (who they are),
      "size": string (rough count or revenue),
      "acquisitionChannel": string (how to reach them)
    }
  ] (3 entries — one per tier),

  "tailwinds": [string, string, string] (exactly 3 macro trends helping),
  "headwinds": [string, string, string] (exactly 3 macro risks),

  "opportunityScore": number (0-100 — your honest verdict),
  "summary": string (3-4 sentence verdict)
}

Rules:
- Realistic numbers. No magical hockey-stick growth.
- Tailwinds and headwinds must be macro (regulatory, demographic, technological), not company-specific.
- Customer segments are tiered for the chasm-crossing model.
- Be honest. Bad ideas get low scores.
- Zero spelling mistakes.`

export async function runAtlas(idea: string, dna?: DNA): Promise<AtlasOutput> {
  const user = `Idea: "${idea}"

Produce the Atlas market sizing + opportunity report.${dna ? dnaContextBlock(dna) : ''}`

  return callAgentJSON<AtlasOutput>('atlas', SYSTEM + (dna ? dnaContextBlock(dna) : ''), user, {
    temperature: 0.3,
    maxTokens: 3000,
    timeoutMs: 90_000,
  })
}
