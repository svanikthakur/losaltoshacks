/**
 * Founder DNA Profile — formatted as a context block for LLM prompts.
 * Every agent prepends this to its system prompt so all recommendations are
 * personalized to the operator running the pipeline.
 */
import type { Founder } from '../types/index.js'

export interface DNA {
  skills: string[]
  riskTolerance: 1 | 2 | 3 | 4 | 5
  location?: string
  networkSize?: number
  hoursPerWeek?: number
  priorStartups?: number
  industryFocus?: string
}

const EMPTY_DNA: DNA = { skills: [], riskTolerance: 3 }

export function dnaFromFounder(f: Founder | null | undefined): DNA {
  if (!f) return EMPTY_DNA
  return {
    skills: f.skills || [],
    riskTolerance: ((f as any).riskScore as 1 | 2 | 3 | 4 | 5) ||
      mapRiskTolerance(f.riskTolerance) ||
      3,
    location: f.location,
    networkSize: f.networkSize,
    hoursPerWeek: (f as any).hoursPerWeek,
    priorStartups: (f as any).priorStartups,
    industryFocus: f.industryFocus,
  }
}

function mapRiskTolerance(t: 'low' | 'medium' | 'high' | undefined): 1 | 2 | 3 | 4 | 5 {
  if (t === 'low') return 2
  if (t === 'high') return 5
  return 3
}

/** Stable signature for cache keying — same DNA → same hash chunk. */
export function dnaSignature(d: DNA): string {
  return [
    d.skills.slice().sort().join(','),
    d.riskTolerance,
    d.location || '',
    d.networkSize || 0,
    d.hoursPerWeek || 0,
    d.priorStartups || 0,
    d.industryFocus || '',
  ].join('|')
}

/** Plain-text context block prepended to every agent system prompt. */
export function dnaContextBlock(d: DNA): string {
  if (!d.skills.length && !d.location && !d.networkSize) {
    return '' // No DNA — return empty so prompts stay clean
  }
  return `

OPERATOR DNA (personalize all output to this profile):
- Skills: ${d.skills.join(', ') || 'unspecified'}
- Risk tolerance: ${d.riskTolerance}/5
- Location: ${d.location || 'unspecified'}
- Network size: ${d.networkSize || 'unspecified'}
- Time commitment: ${d.hoursPerWeek ? `${d.hoursPerWeek}h/week` : 'unspecified'}
- Prior startups: ${d.priorStartups ?? 0}
- Industry focus: ${d.industryFocus || 'unspecified'}

Tailor recommendations to the operator's strengths, time budget, and network reach.
`
}
