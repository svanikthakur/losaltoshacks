/**
 * Fundraising Timeline Builder — generates a 12-week week-by-week roadmap.
 * Personalized with operator DNA (location, network, hours/week).
 */
import { callAgentJSON } from '../services/ai.js'
import { dnaContextBlock, type DNA } from '../services/dnaContext.js'
import type { AtlasOutput } from './Atlas.js'

export interface TimelineMilestone {
  week: number
  title: string
  category: 'narrative' | 'outreach' | 'product' | 'meetings' | 'close'
  subtasks: string[]
}

export interface TimelineOutput {
  weeks: TimelineMilestone[]
}

const SYSTEM = `You are a fundraising coach. Build a realistic 12-week roadmap for a founder
preparing to raise their next round. Each week has a single primary milestone and 2-4
concrete sub-tasks. Mix narrative work, product polish, outreach, meetings, and close.
Return ONLY JSON:
{
  "weeks": [
    {
      "week": number (1-12),
      "title": string,
      "category": "narrative" | "outreach" | "product" | "meetings" | "close",
      "subtasks": string[]
    }
  ]
}
Be specific to the stage. Earlier weeks: narrative + product. Middle weeks: outreach + meetings.
Final weeks: meetings + close.`

export async function runTimeline(
  idea: string,
  stage: 'idea' | 'mvp' | 'revenue',
  atlas: AtlasOutput,
  dna: DNA,
): Promise<TimelineOutput> {
  const user = `Idea: "${idea}"
Stage: ${stage}
Industry: ${dna.industryFocus || 'unspecified'}
Location: ${dna.location || 'unspecified'}
Available hours/week: ${dna.hoursPerWeek || 'unspecified'}
Launch region: ${atlas.launchRegion}
Tailwinds: ${(atlas.tailwinds || []).join(' | ')}${dnaContextBlock(dna)}

Generate the 12-week fundraising roadmap.`

  return callAgentJSON<TimelineOutput>(
    'pivot',
    SYSTEM + dnaContextBlock(dna),
    user,
    { temperature: 0.4, timeoutMs: 60_000 },
  )
}
