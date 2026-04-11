/**
 * In-memory store. Swap for Supabase / Postgres when you're ready.
 * Shape mirrors the schema in the PRD.
 */
import { randomUUID } from 'crypto'

export type Founder = {
  id: string
  email: string
  passwordHash: string
  name: string
  createdAt: number
  skills: string[]
  location?: string
  industryFocus?: string
  riskTolerance?: string
}

export type Report = {
  id: string
  founderId: string
  idea: string
  category?: string
  createdAt: number
  status: 'pending' | 'processing' | 'complete' | 'error'
  validation_score?: number
  scout_output?: any
  atlas_output?: any
  forge_output?: any
  deck_output?: any
  connect_output?: any
  pdf_report_url?: string
  pitch_deck_url?: string
  github_repo_url?: string
  investor_sheet_url?: string
}

const founders = new Map<string, Founder>()
const foundersByEmail = new Map<string, Founder>()
const reports = new Map<string, Report>()

export const db = {
  createFounder(data: Omit<Founder, 'id' | 'createdAt' | 'skills'>) {
    const f: Founder = { ...data, id: randomUUID(), createdAt: Date.now(), skills: [] }
    founders.set(f.id, f)
    foundersByEmail.set(f.email, f)
    return f
  },
  getFounder(id: string) {
    return founders.get(id)
  },
  getFounderByEmail(email: string) {
    return foundersByEmail.get(email)
  },
  updateFounder(id: string, patch: Partial<Founder>) {
    const f = founders.get(id)
    if (!f) return
    Object.assign(f, patch)
    return f
  },
  createReport(data: { founderId: string; idea: string; category?: string }) {
    const r: Report = {
      id: randomUUID(),
      founderId: data.founderId,
      idea: data.idea,
      category: data.category,
      createdAt: Date.now(),
      status: 'pending',
    }
    reports.set(r.id, r)
    return r
  },
  getReport(id: string) {
    return reports.get(id)
  },
  updateReport(id: string, patch: Partial<Report>) {
    const r = reports.get(id)
    if (!r) return
    Object.assign(r, patch)
    return r
  },
  listReportsForFounder(founderId: string) {
    return [...reports.values()]
      .filter((r) => r.founderId === founderId)
      .sort((a, b) => b.createdAt - a.createdAt)
  },
}
