/**
 * Scout — startup market intelligence agent.
 * Pulls Serper web search (general + YC + ProductHunt) + Google Trends,
 * then asks llama3.1 to synthesise a structured scouting report.
 */
import { callAgentJSON } from '../services/ai.js'
import { searchWeb } from '../services/serper.js'
import { getTrends } from '../services/trends.js'

export interface ScoutOutput {
  competitors: Array<{ name: string; description: string; stage?: string }>
  demandSignal: 'low' | 'medium' | 'high'
  trendDirection: 'rising' | 'stable' | 'declining'
  marketKeywords: string[]
  collisionRisk: 'low' | 'medium' | 'high'
  ycPresence: boolean
  summary: string
  // Frontend-compat fields (lets the existing Report.tsx render without changes)
  demandScore: number
  painPoints: string[]
  sources: string[]
  quotes: string[]
}

const SYSTEM = `You are Scout, a startup market intelligence agent.
Given an idea plus real web search results and trend data, return a structured intelligence dispatch.
Return ONLY valid JSON (no markdown, no commentary) with this shape:
{
  "competitors": [{"name": string, "description": string, "stage": string}],
  "demandSignal": "low" | "medium" | "high",
  "trendDirection": "rising" | "stable" | "declining",
  "marketKeywords": string[],
  "collisionRisk": "low" | "medium" | "high",
  "ycPresence": boolean,
  "summary": string,
  "demandScore": number (1-10 integer),
  "painPoints": string[] (3-5 short phrases),
  "sources": string[] (up to 5 source URLs),
  "quotes": string[] (2-3 realistic customer quotes inferred from signals)
}
Be honest. If demand is weak, say so. Ground your analysis in the evidence you were given.`

export async function runScout(idea: string): Promise<ScoutOutput> {
  const [general, yc, ph, trends] = await Promise.all([
    searchWeb(`${idea} startup competitors funding 2025`),
    searchWeb(`site:ycombinator.com/companies ${idea}`),
    searchWeb(`site:producthunt.com ${idea}`),
    getTrends(idea),
  ])

  const user = `Idea: "${idea}"

General web results:
${JSON.stringify(general, null, 2)}

Y Combinator hits:
${JSON.stringify(yc, null, 2)}

ProductHunt hits:
${JSON.stringify(ph, null, 2)}

Google Trends: ${JSON.stringify(trends)}`

  return callAgentJSON<ScoutOutput>('scout', SYSTEM, user, { temperature: 0.3 })
}
