/**
 * In-memory store. Used when SUPABASE_URL is not set (local dev, demos).
 * Shape mirrors the subset of the spec schema the pipeline actually touches.
 */
import { randomUUID } from 'crypto'
import type { Founder, Report, ScoreHistoryEntry, VcMatch, EmailTracking } from '../types/index.js'

const founders = new Map<string, Founder>()
const foundersByEmail = new Map<string, Founder>()
const reports = new Map<string, Report>()
const scoreHistory: ScoreHistoryEntry[] = []
const vcMatches = new Map<string, VcMatch>()
const vcByReport = new Map<string, Set<string>>()
const emailTracking = new Map<string, EmailTracking>()
const emailByToken = new Map<string, EmailTracking>()

export const memoryStore = {
  /* ───── founders ───── */
  createFounder(data: Omit<Founder, 'id' | 'createdAt' | 'skills'>): Founder {
    const f: Founder = { ...data, id: randomUUID(), createdAt: Date.now(), skills: [] }
    founders.set(f.id, f)
    foundersByEmail.set(f.email, f)
    return f
  },
  getFounder(id: string) {
    return founders.get(id) || null
  },
  getFounderByEmail(email: string) {
    return foundersByEmail.get(email) || null
  },
  updateFounder(id: string, patch: Partial<Founder>) {
    const f = founders.get(id)
    if (!f) return null
    Object.assign(f, patch)
    return f
  },

  /* ───── reports ───── */
  createReport(data: { founderId: string; ideaText: string }): Report {
    const r: Report = {
      id: randomUUID(),
      founderId: data.founderId,
      ideaText: data.ideaText,
      validationScore: 0,
      status: 'pending',
      createdAt: Date.now(),
    }
    reports.set(r.id, r)
    return r
  },
  getReport(id: string) {
    return reports.get(id) || null
  },
  updateReport(id: string, patch: Partial<Report>) {
    const r = reports.get(id)
    if (!r) return null
    Object.assign(r, patch)
    return r
  },
  listReportsForFounder(founderId: string): Report[] {
    return [...reports.values()]
      .filter((r) => r.founderId === founderId)
      .sort((a, b) => b.createdAt - a.createdAt)
  },

  /* ───── score history ───── */
  insertScoreHistory(reportId: string, score: number) {
    scoreHistory.push({ id: randomUUID(), reportId, score, recordedAt: Date.now() })
  },
  listScoreHistory(reportId: string): ScoreHistoryEntry[] {
    return scoreHistory.filter((h) => h.reportId === reportId)
  },

  /* ───── vc matches ───── */
  insertVcMatches(reportId: string, matches: Omit<VcMatch, 'id' | 'reportId'>[]): VcMatch[] {
    const inserted: VcMatch[] = matches.map((m) => ({
      ...m,
      id: randomUUID(),
      reportId,
    }))
    if (!vcByReport.has(reportId)) vcByReport.set(reportId, new Set())
    for (const v of inserted) {
      vcMatches.set(v.id, v)
      vcByReport.get(reportId)!.add(v.id)
    }
    return inserted
  },
  getVcMatch(id: string) {
    return vcMatches.get(id) || null
  },
  updateVcMatch(id: string, patch: Partial<VcMatch>) {
    const v = vcMatches.get(id)
    if (!v) return null
    Object.assign(v, patch)
    return v
  },
  listVcMatches(reportId: string): VcMatch[] {
    const ids = vcByReport.get(reportId)
    if (!ids) return []
    return [...ids].map((i) => vcMatches.get(i)!).filter(Boolean)
  },

  /* ───── email tracking ───── */
  createEmailTracking(vcMatchId: string): EmailTracking {
    const e: EmailTracking = {
      id: randomUUID(),
      vcMatchId,
      trackingToken: randomUUID(),
    }
    emailTracking.set(e.id, e)
    emailByToken.set(e.trackingToken, e)
    return e
  },
  recordEmailOpen(token: string) {
    const e = emailByToken.get(token)
    if (!e || e.openedAt) return
    e.openedAt = Date.now()
  },
  listEmailTrackingForReport(reportId: string): EmailTracking[] {
    const ids = vcByReport.get(reportId)
    if (!ids) return []
    return [...emailTracking.values()].filter((t) => ids.has(t.vcMatchId))
  },
}

export type MemoryStore = typeof memoryStore
