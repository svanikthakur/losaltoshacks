/**
 * Scout — market intelligence agent.
 *
 * Real data only. Single Serper call grounds the prompt; OpenAI synthesises
 * the structured brief.
 */
import { callAgentJSON } from '../services/ai.js'
import { searchWeb, type SerperResult } from '../services/serper.js'
import { getTrends } from '../services/trends.js'
import { validateSources, type CandidateSource } from '../services/sourceValidator.js'
import { getOnchainSignals, type SolanaSnapshot } from '../services/solana.js'
import { getCollisionReport, type CollisionReport } from '../services/collision.js'
import { dnaContextBlock, type DNA } from '../services/dnaContext.js'

export interface ScoutCompetitor {
  name: string
  stage: string
  weakness: string
  funding: string
}

export interface ScoutMarketSignal {
  source: 'trend' | 'forum' | 'launch' | 'press' | 'social' | 'onchain'
  signal: string
  evidenceUrl?: string
}

export interface ScoutSource {
  title: string
  url: string
  snippet: string
  domain?: string
  trustScore?: number // 0-100 — higher = more trusted
}

export interface ScoutOutput {
  competitors: ScoutCompetitor[]
  collisionScore: number // 0-100
  demandLevel: 'low' | 'medium' | 'high'
  differentiationAngles: [string, string, string] // exactly 3
  marketSignals: ScoutMarketSignal[] // 4-6 signals across categories
  marketArticle: {
    headline: string
    lede: string
    body: string
  }
  sources: ScoutSource[]
  summary: string
  onchain?: SolanaSnapshot // populated when the idea is web3 adjacent
  collision?: CollisionReport // cross-platform collision (PH + YC + internal)
}

const SYSTEM = `You are Scout, a deep market intelligence analyst.

Given an idea + live web search results, return a structured brief.

Return ONLY valid JSON matching this exact shape:
{
  "competitors": [
    {
      "name": string (real company from the search results),
      "stage": string (pre-seed | seed | series-a | series-b | series-c | public | acquired | unknown),
      "weakness": string (one specific sentence — what they're missing),
      "funding": string (e.g. "$4.2M seed (2024)" or "unknown")
    }
  ] (4-6 entries),
  "collisionScore": number (0-100, where 100 = saturated and 0 = wide open),
  "demandLevel": "low" | "medium" | "high",
  "differentiationAngles": [string, string, string] (exactly 3 — each one a SPECIFIC angle no competitor is taking),
  "marketSignals": [
    {
      "source": "trend" | "forum" | "launch" | "press" | "social",
      "signal": string (one short factual claim),
      "evidenceUrl": string (a URL from the search results that supports it)
    }
  ] (4-6 signals — mix sources),
  "marketArticle": {
    "headline": string (8-12 words, Bloomberg-style),
    "lede": string (one paragraph that sets the scene),
    "body": string (3-4 paragraphs separated by \\n\\n — analysis, not fluff)
  },
  "sources": [
    {"title": string, "url": string, "snippet": string}
  ] (up to 6 — pulled from the search results),
  "summary": string (3-4 sentences — the verdict)
}

Rules:
- Ground every competitor, signal, and source in the search results provided. Never invent.
- Differentiation angles must be SPECIFIC (e.g. "vertical for dental clinics" not "go niche").
- Honest verdicts. Crowded market = high collisionScore. Weak demand = "low".
- Zero spelling mistakes.`

function serperToCandidates(results: SerperResult[]): CandidateSource[] {
  return results.map((r) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet || '',
  }))
}

export async function runScout(
  idea: string,
  dna?: DNA,
  founderId?: string,
): Promise<ScoutOutput> {
  const query = `${idea} startup competitors funding 2025 ycombinator producthunt launch`
  const [results, trends, onchain, collision] = await Promise.all([
    searchWeb(query, 14),
    getTrends(idea),
    getOnchainSignals(idea),
    getCollisionReport(idea, founderId),
  ])

  // Pre-validate Serper results so the model is grounded on trusted sources only
  const trustedCandidates = validateSources(idea, serperToCandidates(results), 10, 50)
  const trustedForPrompt = trustedCandidates.map((t) => ({
    title: t.title,
    url: t.url,
    snippet: t.snippet,
    domain: t.domain,
  }))

  const collisionBlock = `

Real platform collision report (pulled just now from Product Hunt, YC, and the internal Venture AI DB):
${JSON.stringify(
    {
      score: collision.score,
      summary: collision.summary,
      breakdown: collision.breakdown,
      productHuntLaunches: collision.productHuntLaunches.map((p) => ({
        name: p.name,
        tagline: p.tagline,
        votes: p.votesCount,
        createdAt: p.createdAt,
        url: p.url,
      })),
      ycCompanies: collision.ycCompanies.map((c) => ({
        name: c.name,
        one_liner: c.one_liner,
        batch: c.batch,
        status: c.status,
        website: c.website,
      })),
      internalCollisions: collision.internalIdeas.length,
    },
    null,
    2,
  )}

Use this collision data to ground the collisionScore field. If this report shows 3+ platforms with direct matches, collisionScore MUST be ≥ 70. Surface 2-3 of the strongest matches as competitors if they're real, and mention the internal collision count in the summary if > 0.`

  const onchainBlock = onchain.relevant
    ? `

Solana on-chain demand signals (real, pulled just now from DeFi Llama + Solana RPC):
${JSON.stringify(
    {
      summary: onchain.summary,
      matchedTerms: onchain.queryTerms,
      protocols: onchain.protocols.map((p) => ({
        name: p.name,
        category: p.category,
        tvlUsd: p.tvl,
        change7dPct: p.change7d,
        change30dPct: p.change30d,
        url: p.url,
      })),
      network: onchain.network,
    },
    null,
    2,
  )}

Treat these on-chain signals as first-class evidence — they are live market data. Include at least two of them inside marketSignals with source="onchain".`
    : ''

  const user = `Idea: "${idea}"

Live web search results (pre-filtered to trusted domains only):
${JSON.stringify(trustedForPrompt, null, 2)}

Google Trends signal: ${JSON.stringify(trends)}${collisionBlock}${onchainBlock}${dna ? dnaContextBlock(dna) : ''}

Produce the Scout intelligence brief. Pull real names from the search URLs.
Never cite a source outside the list above.`

  const out = await callAgentJSON<ScoutOutput>('scout', SYSTEM + (dna ? dnaContextBlock(dna) : ''), user, {
    temperature: 0.3,
    maxTokens: 3500,
    timeoutMs: 90_000,
  })

  // Re-validate whatever sources the model produced, then merge with the
  // trusted Serper candidates so we always surface something useful.
  const modelSources = Array.isArray(out.sources) ? out.sources : []
  const combined: CandidateSource[] = [
    ...modelSources.map((s) => ({ title: s.title, url: s.url, snippet: s.snippet || '' })),
    ...serperToCandidates(results),
  ]
  const validated = validateSources(idea, combined, 6, 50)
  out.sources = validated.map((v) => ({
    title: v.title,
    url: v.url,
    snippet: v.snippet,
    domain: v.domain,
    trustScore: v.trustScore,
  }))

  // Attach the raw snapshots so the frontend can render them.
  if (onchain.relevant) out.onchain = onchain
  out.collision = collision
  // Blend the LLM's collisionScore with our real platform data — we trust the
  // real data, so take the max. That makes the UI never under-report crowding.
  if (typeof out.collisionScore === 'number') {
    out.collisionScore = Math.max(out.collisionScore, collision.score)
  } else {
    out.collisionScore = collision.score
  }

  return out
}
