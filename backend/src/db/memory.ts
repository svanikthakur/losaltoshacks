/**
 * In-memory store. Used when SUPABASE_URL is not set (local dev, demos).
 *
 * All methods are async (return Promises) even though the data lives in a Map.
 * This keeps the call-site contract identical across the memory + supabase adapters.
 */
import { randomUUID } from 'crypto'
import type {
  Founder,
  Report,
  ScoreHistoryEntry,
  VcMatch,
  EmailTracking,
  SimulatorSession,
} from '../types/index.js'

const founders = new Map<string, Founder>()
const foundersByEmail = new Map<string, Founder>()
const reports = new Map<string, Report>()
const scoreHistory: ScoreHistoryEntry[] = []
const vcMatches = new Map<string, VcMatch>()
const vcByReport = new Map<string, Set<string>>()
const emailTracking = new Map<string, EmailTracking>()
const emailByToken = new Map<string, EmailTracking>()
const simulatorSessions = new Map<string, SimulatorSession>()

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

  /* ───── founder DNA / network ───── */
  async listAllFounders(): Promise<Founder[]> {
    return [...founders.values()]
  },

  /* ───── simulator sessions ───── */
  async createSimulatorSession(data: Omit<SimulatorSession, 'id' | 'createdAt'>): Promise<SimulatorSession> {
    const s: SimulatorSession = { ...data, id: randomUUID(), createdAt: Date.now() }
    simulatorSessions.set(s.id, s)
    return s
  },
  async listSimulatorSessions(reportId: string): Promise<SimulatorSession[]> {
    return [...simulatorSessions.values()]
      .filter((s) => s.reportId === reportId)
      .sort((a, b) => b.createdAt - a.createdAt)
  },

  /* ───── community benchmarks ───── */
  async communityBenchmarks(): Promise<{ avgScore: number; topDecile: number; sampleSize: number }> {
    const scores = [...reports.values()]
      .filter((r) => r.status === 'complete' && r.validationScore > 0)
      .map((r) => r.validationScore)
    if (scores.length === 0) return { avgScore: 0, topDecile: 0, sampleSize: 0 }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const sorted = scores.slice().sort((a, b) => b - a)
    const topDecile = sorted[Math.floor(sorted.length * 0.1)] || sorted[0]
    return { avgScore: Math.round(avg * 10) / 10, topDecile, sampleSize: scores.length }
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
    if (!e) return
    if (!e.openedAt) e.openedAt = Date.now()
    e.openCount = (e.openCount || 0) + 1
  },
  async recordEmailClick(token: string): Promise<void> {
    const e = emailByToken.get(token)
    if (!e) return
    if (!e.clickedAt) e.clickedAt = Date.now()
    e.clickCount = (e.clickCount || 0) + 1
  },
  async recordEmailDelivered(token: string): Promise<void> {
    const e = emailByToken.get(token)
    if (!e) return
    if (!e.deliveredAt) e.deliveredAt = Date.now()
  },
  async recordEmailBounced(token: string): Promise<void> {
    const e = emailByToken.get(token)
    if (!e) return
    if (!e.bouncedAt) e.bouncedAt = Date.now()
  },
  async getEmailTrackingByToken(token: string): Promise<EmailTracking | null> {
    return emailByToken.get(token) || null
  },
  async listEmailTrackingForReport(reportId: string): Promise<EmailTracking[]> {
    const ids = vcByReport.get(reportId)
    if (!ids) return []
    return [...emailTracking.values()].filter((t) => ids.has(t.vcMatchId))
  },
}

export type DB = typeof memoryStore
