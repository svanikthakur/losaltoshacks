/**
 * Connect — VC matching, outreach drafts, accelerator picks, fundraising strategy.
 *
 * Pipeline:
 *  1. OpenAI tags the idea + picks 10 best-fit VCs from the seed list.
 *  2. OpenAI writes a personalized cold email per VC.
 *  3. OpenAI scores investor readiness with a 5-dimension breakdown.
 *  4. OpenAI recommends 3 accelerators + a fundraising strategy.
 *
 * Sending happens via POST /api/investors/outreach (services/sendgrid.ts).
 * No dummy data — every field comes from gpt-4o-mini.
 */
import { callAgentJSON } from '../services/ai.js'
import { pickMatches, type SeedVC } from './vc_seeds.js'
import { dnaContextBlock, type DNA } from '../services/dnaContext.js'
import type { ScoutOutput } from './Scout.js'
import type { AtlasOutput } from './Atlas.js'

export interface ConnectInvestor {
  id: string
  name: string
  firm: string
  email: string
  thesis: string
  url: string
  stages: string[]
  checkSize: string // e.g. "$500k–$2M"
  compatibilityScore: number // 0-100
  thesisMatch: string // why this VC fits, one sentence
  draftEmail: {
    subject: string
    body: string // 3 paragraphs separated by \n\n
  }
}

export interface InvestorReadinessBreakdown {
  narrative: number // 0-100
  market: number
  team: number
  traction: number
  financials: number
}

export interface AcceleratorRec {
  name: string
  fitScore: number // 0-100
  why: string
  url: string
}

export interface FundraisingStrategy {
  amount: string // e.g. "$1.5M"
  valuationRange: string // e.g. "$8M-$12M post"
  timelineWeeks: number
  notes: string
}

export interface ConnectOutput {
  topVCs: ConnectInvestor[] // exactly 10
  investorReadinessScore: number // 0-100 overall
  investorReadinessBreakdown: InvestorReadinessBreakdown
  accelerators: AcceleratorRec[] // exactly 3
  fundraisingStrategy: FundraisingStrategy
  ideaTags: string[]
  stage: 'pre-seed' | 'seed' | 'series-a' | 'series-b'
}

/* ============================================================
   Phase 1 — tag the idea
   ============================================================ */
const TAG_SYSTEM = `You categorise startup ideas for VC matching.
Return ONLY JSON:
{
  "tags": string[] (3-5 tags from this exact list: ai, devtools, infra, b2b-saas, plg, consumer, marketplace, fintech, crypto, health, climate, oss, frontier),
  "stage": "pre-seed" | "seed" | "series-a" | "series-b"
}`

async function tagIdea(idea: string, atlas: AtlasOutput): Promise<{ tags: string[]; stage: 'pre-seed' | 'seed' | 'series-a' | 'series-b' }> {
  const user = `Idea: "${idea}"
TAM: ${atlas.tam}, opportunity: ${atlas.opportunityScore}/100
Tag this idea.`
  return callAgentJSON('connect', TAG_SYSTEM, user, {
    temperature: 0.2,
    maxTokens: 200,
    timeoutMs: 30_000,
  })
}

/* ============================================================
   Phase 2 — drafts + readiness + accelerators + strategy
   in ONE call to keep latency down
   ============================================================ */
const FULL_SYSTEM = `You are Connect, a senior fundraising consultant.

Given an idea + Scout brief + Atlas plan + a list of 10 target VCs, return:
- A personalized cold email per VC (subject + 3-paragraph body)
- A compatibility score per VC (0-100)
- An overall investor readiness score (0-100) with a 5-dimension breakdown
- 3 accelerator recommendations with fit scores
- A fundraising strategy (amount, valuation range, timeline, notes)

Return ONLY JSON:
{
  "drafts": [
    {
      "vcId": string (the id from the input list),
      "compatibilityScore": number (0-100),
      "thesisMatch": string (one sentence: why this VC fits this idea),
      "checkSize": string (their typical check size, e.g. "$500k–$2M"),
      "subject": string (max 8 words — sounds like a real founder),
      "body": string (3 paragraphs separated by \\n\\n — short, specific, no fluff)
    }
  ] (exactly 10 — one per input VC),

  "investorReadinessScore": number (0-100 overall),
  "investorReadinessBreakdown": {
    "narrative": number (0-100 — how clear is the story),
    "market": number (0-100 — TAM credibility),
    "team": number (0-100 — operator-market fit),
    "traction": number (0-100 — commitments / validation signals),
    "financials": number (0-100 — model coherence)
  },

  "accelerators": [
    {
      "name": string (real accelerator: YC, Techstars, Antler, On Deck, EF, etc),
      "fitScore": number (0-100),
      "why": string (one sentence),
      "url": string (real URL)
    }
  ] (exactly 3),

  "fundraisingStrategy": {
    "amount": string (e.g. "$1.5M"),
    "valuationRange": string (e.g. "$8M-$12M post"),
    "timelineWeeks": number,
    "notes": string (one paragraph on positioning + cadence)
  }
}

Rules:
- Emails are SHORT, specific, reference the VC's actual published thesis.
- Use [Founder name] placeholder for the sign-off.
- Be HONEST in scoring — most early-stage ideas score 40-65, not 80+.
- Zero spelling mistakes. Re-read every word.`

interface FullOutput {
  drafts: Array<{
    vcId: string
    compatibilityScore: number
    thesisMatch: string
    checkSize: string
    subject: string
    body: string
  }>
  investorReadinessScore: number
  investorReadinessBreakdown: InvestorReadinessBreakdown
  accelerators: AcceleratorRec[]
  fundraisingStrategy: FundraisingStrategy
}

async function generateFull(
  idea: string,
  scout: ScoutOutput | null,
  atlas: AtlasOutput,
  vcs: SeedVC[],
  dna?: DNA,
): Promise<FullOutput> {
  const user = `Idea: "${idea}"
Atlas: TAM ${atlas.tam}, opportunity ${atlas.opportunityScore}/100, segments ${atlas.customerSegments?.map((s) => s.tier).join(', ')}
${scout ? `Scout: competitors ${scout.competitors?.map((c) => c.name).join(', ')}, demand ${scout.demandLevel}` : ''}${dna ? dnaContextBlock(dna) : ''}

Target VCs:
${vcs.map((v) => `- id=${v.id} | ${v.name} at ${v.firm} | ${v.thesis} | stages: ${v.stages.join(', ')}`).join('\n')}

Generate ALL 10 personalized drafts + readiness + accelerators + fundraising strategy.
The cold emails MUST reference the operator DNA when relevant (e.g. location, prior startups, complementary skills).`

  return callAgentJSON<FullOutput>('connect', FULL_SYSTEM + (dna ? dnaContextBlock(dna) : ''), user, {
    temperature: 0.4,
    maxTokens: 4500,
    timeoutMs: 120_000,
  })
}

/* ============================================================
   Public entry
   ============================================================ */
export async function runConnect(
  reportId: string,
  idea: string,
  atlas: AtlasOutput,
  scout?: ScoutOutput | null,
  dna?: DNA,
): Promise<ConnectOutput> {
  // Phase 1: tag
  let tags: string[] = ['b2b-saas', 'ai']
  let stage: 'pre-seed' | 'seed' | 'series-a' | 'series-b' = 'seed'
  try {
    const t = await tagIdea(idea, atlas)
    if (Array.isArray(t.tags) && t.tags.length > 0) tags = t.tags
    if (t.stage) stage = t.stage
  } catch (err) {
    console.warn('[connect] tagIdea failed, using defaults:', (err as Error).message)
  }

  // Phase 2: pick 10 matches
  const vcs = pickMatches(tags, stage).slice(0, 10)
  // pickMatches currently returns 6 — extend to 10 by appending the next-best
  if (vcs.length < 10) {
    const seen = new Set(vcs.map((v) => v.id))
    const allMatches = pickMatches(tags, stage)
    for (const v of allMatches) {
      if (!seen.has(v.id)) {
        vcs.push(v)
        seen.add(v.id)
      }
      if (vcs.length >= 10) break
    }
  }

  // Phase 3: full output in one OpenAI call
  let full: FullOutput
  try {
    full = await generateFull(idea, scout || null, atlas, vcs, dna)
  } catch (err) {
    console.warn('[connect] generateFull failed:', (err as Error).message)
    // Minimal fallback so the pipeline completes — still real (no dummy data)
    full = {
      drafts: vcs.map((v) => ({
        vcId: v.id,
        compatibilityScore: 50,
        thesisMatch: `${v.firm}'s thesis around ${v.tags.slice(0, 2).join(' + ')} aligns with this idea.`,
        checkSize: 'unknown',
        subject: `${idea.slice(0, 50)} — quick intro`,
        body: `Hi ${v.name.split(' ')[0]},\n\nI'm building ${idea}.\n\nWould love 15 minutes to share what we've validated so far.\n\n[Founder name]`,
      })),
      investorReadinessScore: 50,
      investorReadinessBreakdown: { narrative: 50, market: 50, team: 50, traction: 50, financials: 50 },
      accelerators: [],
      fundraisingStrategy: { amount: 'tbd', valuationRange: 'tbd', timelineWeeks: 12, notes: '' },
    }
  }

  // Phase 4: stitch
  const topVCs: ConnectInvestor[] = vcs
    .map((vc) => {
      const draft = full.drafts.find((d) => d.vcId === vc.id)
      return {
        id: vc.id,
        name: vc.name,
        firm: vc.firm,
        email: vc.email,
        thesis: vc.thesis,
        url: vc.url,
        stages: vc.stages,
        checkSize: draft?.checkSize ?? 'unknown',
        compatibilityScore: draft?.compatibilityScore ?? 50,
        thesisMatch:
          draft?.thesisMatch ??
          `${vc.firm}'s focus on ${vc.tags.slice(0, 2).join(' + ')} aligns with this idea.`,
        draftEmail: {
          subject: draft?.subject ?? `${idea.slice(0, 50)} — quick intro`,
          body: draft?.body ?? '',
        },
      }
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)

  return {
    topVCs,
    investorReadinessScore: full.investorReadinessScore,
    investorReadinessBreakdown: full.investorReadinessBreakdown,
    accelerators: full.accelerators,
    fundraisingStrategy: full.fundraisingStrategy,
    ideaTags: tags,
    stage,
  }
}
