/**
 * Founder × founder matching.
 *
 * Algorithm:
 *   1. Pull every founder.
 *   2. Build a 4-dim skill vector per founder: [technical, design, business, marketing]
 *      (sum of which buckets they self-classified into).
 *   3. For each candidate, compute cosine similarity to the *complementary* vector
 *      of the requesting founder (i.e. we want OPPOSITES that share an industry).
 *   4. Boost score for same industryFocus and similar risk tolerance.
 *   5. Return top 5.
 */
import { Router } from 'express'
import { db } from '../db/index.js'
import type { Founder } from '../types/index.js'

const router = Router()

const SKILL_BUCKETS: Record<string, number> = {
  // technical
  engineering: 0, code: 0, dev: 0, backend: 0, frontend: 0, ml: 0, ai: 0, data: 0, devops: 0,
  // design
  design: 1, ux: 1, ui: 1, brand: 1, product: 1,
  // business
  sales: 2, biz: 2, ops: 2, finance: 2, legal: 2, strategy: 2,
  // marketing
  marketing: 3, growth: 3, content: 3, seo: 3, community: 3, social: 3,
}

function skillVector(skills: string[]): [number, number, number, number] {
  const v: [number, number, number, number] = [0, 0, 0, 0]
  for (const s of skills) {
    const norm = s.toLowerCase().trim()
    for (const [k, idx] of Object.entries(SKILL_BUCKETS)) {
      if (norm.includes(k)) v[idx as 0 | 1 | 2 | 3]++
    }
  }
  return v
}

function complement(v: [number, number, number, number]): [number, number, number, number] {
  const max = Math.max(...v, 1)
  return v.map((x) => max - x) as [number, number, number, number]
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function reasonFor(self: Founder, other: Founder, score: number): string {
  const sv = skillVector(self.skills)
  const ov = skillVector(other.skills)
  const myStrong = ['technical', 'design', 'business', 'marketing'][sv.indexOf(Math.max(...sv))]
  const theirStrong = ['technical', 'design', 'business', 'marketing'][ov.indexOf(Math.max(...ov))]
  const sameIndustry = self.industryFocus && other.industryFocus === self.industryFocus
  return `${theirStrong} to your ${myStrong}${sameIndustry ? ` · same industry (${self.industryFocus})` : ''} · ${Math.round(score * 100)}% fit`
}

router.get('/matches', async (req, res) => {
  const me = await db.getFounder(req.founderId!)
  if (!me) return res.status(404).json({ error: 'Not found' })

  const all = await db.listAllFounders()
  const myComplement = complement(skillVector(me.skills))

  const candidates = all
    .filter((f) => f.id !== me.id && f.skills.length > 0)
    .map((f) => {
      const v = skillVector(f.skills)
      let score = cosine(myComplement, v)
      if (me.industryFocus && f.industryFocus === me.industryFocus) score *= 1.25
      if (me.riskScore && f.riskScore && Math.abs(me.riskScore - f.riskScore) <= 1) score *= 1.1
      return {
        id: f.id,
        name: f.name,
        location: f.location,
        skills: f.skills,
        industryFocus: f.industryFocus,
        score,
        reason: reasonFor(me, f, score),
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  res.json({ matches: candidates })
})

export default router
