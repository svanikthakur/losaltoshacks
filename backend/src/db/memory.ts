/**
 * In-memory store. Used when SUPABASE_URL is not set (local dev, demos).
 *
 * All methods are async (return Promises) even though the data lives in a Map.
 * This keeps the call-site contract identical across the memory + supabase adapters.
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
  async createFounder(data: Omit<Founder, 'id' | 'createdAt' | 'skills'>): Promise<Founder> {
    const f: Founder = { ...data, id: randomUUID(), createdAt: Date.now(), skills: [] }
    founders.set(f.id, f)
    foundersByEmail.set(f.email, f)
    return f
  },
  async getFounder(id: string): Promise<Founder | null> {
    return founders.get(id) || null
  },
  async getFounderByEmail(email: string): Promise<Founder | null> {
    return foundersByEmail.get(email) || null
  },
  async updateFounder(id: string, patch: Partial<Founder>): Promise<Founder | null> {
    const f = founders.get(id)
    if (!f) return null
    Object.assign(f, patch)
    return f
  },

  /* ───── reports ───── */
  async createReport(data: { founderId: string; ideaText: string }): Promise<Report> {
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
  async getReport(id: string): Promise<Report | null> {
    return reports.get(id) || null
  },
  async updateReport(id: string, patch: Partial<Report>): Promise<Report | null> {
    const r = reports.get(id)
    if (!r) return null
    Object.assign(r, patch)
    return r
  },
  async listReportsForFounder(founderId: string): Promise<Report[]> {
    return [...reports.values()]
      .filter((r) => r.founderId === founderId)
      .sort((a, b) => b.createdAt - a.createdAt)
  },

  /* ───── score history ───── */
  async insertScoreHistory(reportId: string, score: number): Promise<void> {
    scoreHistory.push({ id: randomUUID(), reportId, score, recordedAt: Date.now() })
  },
  async listScoreHistory(reportId: string): Promise<ScoreHistoryEntry[]> {
    return scoreHistory.filter((h) => h.reportId === reportId)
  },

  /* ───── vc matches ───── */
  async insertVcMatches(reportId: string, matches: Omit<VcMatch, 'id' | 'reportId'>[]): Promise<VcMatch[]> {
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
  async getVcMatch(id: string): Promise<VcMatch | null> {
    return vcMatches.get(id) || null
  },
  async updateVcMatch(id: string, patch: Partial<VcMatch>): Promise<VcMatch | null> {
    const v = vcMatches.get(id)
    if (!v) return null
    Object.assign(v, patch)
    return v
  },
  async listVcMatches(reportId: string): Promise<VcMatch[]> {
    const ids = vcByReport.get(reportId)
    if (!ids) return []
    return [...ids].map((i) => vcMatches.get(i)!).filter(Boolean)
  },

  /* ───── email tracking ───── */
  async createEmailTracking(vcMatchId: string): Promise<EmailTracking> {
    const e: EmailTracking = {
      id: randomUUID(),
      vcMatchId,
      trackingToken: randomUUID(),
    }
    emailTracking.set(e.id, e)
    emailByToken.set(e.trackingToken, e)
    return e
  },
  async recordEmailOpen(token: string): Promise<void> {
    const e = emailByToken.get(token)
    if (!e || e.openedAt) return
    e.openedAt = Date.now()
  },
  async listEmailTrackingForReport(reportId: string): Promise<EmailTracking[]> {
    const ids = vcByReport.get(reportId)
    if (!ids) return []
    return [...emailTracking.values()].filter((t) => ids.has(t.vcMatchId))
  },
}

export type DB = typeof memoryStore
