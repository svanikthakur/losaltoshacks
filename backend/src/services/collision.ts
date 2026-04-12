/**
 * Platform Collision Score — cross-references an idea against real platforms
 * in parallel:
 *
 *   - Product Hunt: last 90 days of launches (via PH GraphQL)
 *   - Y Combinator: the full YC company directory
 *   - Internal DB: every idea submitted to Venture AI by other founders
 *
 * Produces a unified 0-100 collision score and a breakdown of exactly which
 * companies/launches/ideas match. This is the core moat behind Scout's
 * collisionScore — Claude/Gamma/Lovable can't do this because they have no
 * memory of other users.
 */
import { db } from '../db/index.js'
import { searchLaunches, type PhLaunch } from './productHunt.js'
import { searchYcCompanies, type YcMatch } from './yc.js'

export interface InternalIdeaMatch {
  reportId: string
  founderId: string
  ideaText: string
  createdAt: number
  score: number
}

export interface CollisionReport {
  /** 0-100 — higher = more crowded */
  score: number
  /** Human-readable one-line summary */
  summary: string
  /** Per-source counts */
  breakdown: {
    productHunt: number
    ycCompanies: number
    internalIdeas: number
  }
  productHuntLaunches: PhLaunch[]
  ycCompanies: YcMatch[]
  internalIdeas: InternalIdeaMatch[]
}

/** Jaccard token overlap — rough similarity between two idea blurbs. */
function jaccard(a: string, b: string): number {
  const ta = new Set(tokenize(a))
  const tb = new Set(tokenize(b))
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  return inter / (ta.size + tb.size - inter)
}

function tokenize(s: string): string[] {
  const STOPWORDS = new Set([
    'a','an','the','and','or','for','of','to','in','on','with','by','from','is','that','this','app','platform','tool','service','ai','using','help','helps','make','build','app','idea',
  ])
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t))
}

async function matchInternalIdeas(
  idea: string,
  excludeFounderId?: string,
  limit = 5,
): Promise<InternalIdeaMatch[]> {
  try {
    const founders = await db.listAllFounders()
    const matches: InternalIdeaMatch[] = []
    for (const f of founders) {
      if (excludeFounderId && f.id === excludeFounderId) continue
      const reports = await db.listReportsForFounder(f.id)
      for (const r of reports) {
        const sim = jaccard(idea, r.ideaText)
        if (sim >= 0.25) {
          matches.push({
            reportId: r.id,
            founderId: f.id,
            ideaText: r.ideaText,
            createdAt: r.createdAt,
            score: Math.round(sim * 100),
          })
        }
      }
    }
    return matches.sort((a, b) => b.score - a.score).slice(0, limit)
  } catch (err) {
    console.warn('[collision] internal idea match failed:', (err as Error).message)
    return []
  }
}

/**
 * Score weights — hand-tuned so the 0-100 range feels meaningful:
 *
 *   Each PH launch          =  8 pts (max 40)
 *   Each YC company         = 10 pts (max 50)
 *   Each internal collision = 12 pts (max 36)
 *
 * Total capped at 100.
 */
function computeScore(ph: number, yc: number, internal: number): number {
  const raw = Math.min(40, ph * 8) + Math.min(50, yc * 10) + Math.min(36, internal * 12)
  return Math.min(100, raw)
}

function buildSummary(r: Omit<CollisionReport, 'summary' | 'score'>, score: number): string {
  const parts: string[] = []
  if (r.breakdown.productHunt > 0) parts.push(`${r.breakdown.productHunt} Product Hunt launch${r.breakdown.productHunt === 1 ? '' : 'es'} (last 90d)`)
  if (r.breakdown.ycCompanies > 0) parts.push(`${r.breakdown.ycCompanies} YC compan${r.breakdown.ycCompanies === 1 ? 'y' : 'ies'}`)
  if (r.breakdown.internalIdeas > 0) parts.push(`${r.breakdown.internalIdeas} other founder${r.breakdown.internalIdeas === 1 ? '' : 's'} on Venture AI`)
  if (parts.length === 0) return `Collision ${score}/100 — no direct platform collisions detected.`
  return `Collision ${score}/100 — matched ${parts.join(', ')}.`
}

export async function getCollisionReport(
  idea: string,
  excludeFounderId?: string,
): Promise<CollisionReport> {
  const [phLaunches, ycMatches, internalMatches] = await Promise.all([
    searchLaunches(idea, 5),
    searchYcCompanies(idea, 5),
    matchInternalIdeas(idea, excludeFounderId, 5),
  ])

  const breakdown = {
    productHunt: phLaunches.length,
    ycCompanies: ycMatches.length,
    internalIdeas: internalMatches.length,
  }
  const score = computeScore(breakdown.productHunt, breakdown.ycCompanies, breakdown.internalIdeas)
  const partial = {
    breakdown,
    productHuntLaunches: phLaunches,
    ycCompanies: ycMatches,
    internalIdeas: internalMatches,
  }
  return {
    score,
    summary: buildSummary(partial, score),
    ...partial,
  }
}
