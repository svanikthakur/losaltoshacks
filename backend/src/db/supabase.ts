/**
 * Supabase adapter. Mirrors the method surface of memoryStore.
 * Maps snake_case Postgres columns <-> camelCase TypeScript types.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Founder, Report, ScoreHistoryEntry, VcMatch, EmailTracking } from '../types/index.js'
import type { DB } from './memory.js'

const client: SupabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
)

/* ============================================================
   Row shapes in Postgres (snake_case) and row→type mappers
   ============================================================ */

type FounderRow = {
  id: string
  email: string
  name: string | null
  password_hash: string | null
  skills: string[] | null
  location: string | null
  industry_focus: string | null
  risk_tolerance: 'low' | 'medium' | 'high' | null
  risk_score: number | null
  network_size: number | null
  hours_per_week: number | null
  prior_startups: number | null
  tier: 'founder' | 'pro' | 'team' | null
  created_at: string
}

type ReportRow = {
  id: string
  founder_id: string
  idea_text: string
  validation_score: number
  status: 'pending' | 'running' | 'complete' | 'failed'
  scout_output: unknown
  atlas_output: unknown
  forge_output: unknown
  deck_output: unknown
  connect_output: unknown
  deck_url: string | null
  notion_url: string | null
  github_repo_url: string | null
  pdf_report_url: string | null
  pitch_deck_url: string | null
  investor_sheet_url: string | null
  created_at: string
}

const rowToFounder = (r: FounderRow): Founder => ({
  id: r.id,
  email: r.email,
  name: r.name ?? '',
  passwordHash: r.password_hash ?? '',
  skills: r.skills ?? [],
  location: r.location ?? undefined,
  industryFocus: r.industry_focus ?? undefined,
  riskTolerance: r.risk_tolerance ?? undefined,
  riskScore: (r.risk_score as 1 | 2 | 3 | 4 | 5 | null) ?? undefined,
  networkSize: r.network_size ?? undefined,
  hoursPerWeek: r.hours_per_week ?? undefined,
  priorStartups: r.prior_startups ?? undefined,
  tier: r.tier ?? undefined,
  createdAt: new Date(r.created_at).getTime(),
})

const rowToReport = (r: ReportRow): Report => ({
  id: r.id,
  founderId: r.founder_id,
  ideaText: r.idea_text,
  validationScore: r.validation_score,
  status: r.status,
  scout_output: r.scout_output,
  atlas_output: r.atlas_output,
  forge_output: r.forge_output,
  deck_output: r.deck_output,
  connect_output: r.connect_output,
  pdf_report_url: r.pdf_report_url ?? undefined,
  pitch_deck_url: r.pitch_deck_url ?? undefined,
  github_repo_url: r.github_repo_url ?? undefined,
  investor_sheet_url: r.investor_sheet_url ?? undefined,
  deck_url: r.deck_url ?? undefined,
  notion_url: r.notion_url ?? undefined,
  createdAt: new Date(r.created_at).getTime(),
})

/* ============================================================
   Preflight check — verifies the schema exists
   ============================================================ */
export async function supabasePreflight(): Promise<{ ok: boolean; reason?: string }> {
  const { error } = await client.from('founders').select('id').limit(1)
  if (error) {
    return { ok: false, reason: error.message }
  }
  return { ok: true }
}

/* ============================================================
   ADAPTER — matches memoryStore's method surface exactly
   ============================================================ */
export const supabaseStore: DB = {
  /* ───── founders ───── */
  async createFounder(data) {
    const { data: row, error } = await client
      .from('founders')
      .insert({
        email: data.email,
        name: data.name,
        password_hash: data.passwordHash,
      })
      .select()
      .single()
    if (error || !row) throw new Error(`createFounder: ${error?.message}`)
    return rowToFounder(row as FounderRow)
  },

  async getFounder(id) {
    const { data: row, error } = await client
      .from('founders')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`getFounder: ${error.message}`)
    return row ? rowToFounder(row as FounderRow) : null
  },

  async getFounderByEmail(email) {
    const { data: row, error } = await client
      .from('founders')
      .select('*')
      .eq('email', email)
      .maybeSingle()
    if (error) throw new Error(`getFounderByEmail: ${error.message}`)
    return row ? rowToFounder(row as FounderRow) : null
  },

  async updateFounder(id, patch) {
    const update: Record<string, unknown> = {}
    if (patch.name !== undefined) update.name = patch.name
    if (patch.skills !== undefined) update.skills = patch.skills
    if (patch.location !== undefined) update.location = patch.location
    if (patch.industryFocus !== undefined) update.industry_focus = patch.industryFocus
    if (patch.riskTolerance !== undefined) update.risk_tolerance = patch.riskTolerance
    if (patch.riskScore !== undefined) update.risk_score = patch.riskScore
    if (patch.networkSize !== undefined) update.network_size = patch.networkSize
    if (patch.hoursPerWeek !== undefined) update.hours_per_week = patch.hoursPerWeek
    if (patch.priorStartups !== undefined) update.prior_startups = patch.priorStartups
    if (patch.tier !== undefined) update.tier = patch.tier
    if (patch.passwordHash !== undefined) update.password_hash = patch.passwordHash
    const { data: row, error } = await client
      .from('founders')
      .update(update)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw new Error(`updateFounder: ${error.message}`)
    return row ? rowToFounder(row as FounderRow) : null
  },

  /* ───── reports ───── */
  async createReport(data) {
    const { data: row, error } = await client
      .from('reports')
      .insert({
        founder_id: data.founderId,
        idea_text: data.ideaText,
        status: 'pending',
      })
      .select()
      .single()
    if (error || !row) throw new Error(`createReport: ${error?.message}`)
    return rowToReport(row as ReportRow)
  },

  async getReport(id) {
    const { data: row, error } = await client
      .from('reports')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`getReport: ${error.message}`)
    return row ? rowToReport(row as ReportRow) : null
  },

  async updateReport(id, patch) {
    const update: Record<string, unknown> = {}
    if (patch.status !== undefined) update.status = patch.status
    if (patch.validationScore !== undefined) update.validation_score = patch.validationScore
    if (patch.scout_output !== undefined) update.scout_output = patch.scout_output
    if (patch.atlas_output !== undefined) update.atlas_output = patch.atlas_output
    if (patch.forge_output !== undefined) update.forge_output = patch.forge_output
    if (patch.deck_output !== undefined) update.deck_output = patch.deck_output
    if (patch.connect_output !== undefined) update.connect_output = patch.connect_output
    if (patch.deck_url !== undefined) update.deck_url = patch.deck_url
    if (patch.notion_url !== undefined) update.notion_url = patch.notion_url
    if (patch.github_repo_url !== undefined) update.github_repo_url = patch.github_repo_url
    if (patch.pdf_report_url !== undefined) update.pdf_report_url = patch.pdf_report_url
    if (patch.pitch_deck_url !== undefined) update.pitch_deck_url = patch.pitch_deck_url
    if (patch.investor_sheet_url !== undefined) update.investor_sheet_url = patch.investor_sheet_url
    const { data: row, error } = await client
      .from('reports')
      .update(update)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw new Error(`updateReport: ${error.message}`)
    return row ? rowToReport(row as ReportRow) : null
  },

  async listReportsForFounder(founderId) {
    const { data: rows, error } = await client
      .from('reports')
      .select('*')
      .eq('founder_id', founderId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`listReportsForFounder: ${error.message}`)
    return (rows || []).map((r) => rowToReport(r as ReportRow))
  },

  /* ───── score history ───── */
  async insertScoreHistory(reportId, score) {
    const { error } = await client.from('score_history').insert({
      report_id: reportId,
      score,
    })
    if (error) throw new Error(`insertScoreHistory: ${error.message}`)
  },

  async listScoreHistory(reportId) {
    const { data: rows, error } = await client
      .from('score_history')
      .select('*')
      .eq('report_id', reportId)
      .order('recorded_at', { ascending: true })
    if (error) throw new Error(`listScoreHistory: ${error.message}`)
    return (rows || []).map((r: any) => ({
      id: r.id,
      reportId: r.report_id,
      score: r.score,
      recordedAt: new Date(r.recorded_at).getTime(),
    })) as ScoreHistoryEntry[]
  },

  /* ───── vc matches (basic) ───── */
  async insertVcMatches(reportId, matches) {
    const rows = matches.map((m) => ({
      report_id: reportId,
      vc_name: m.vcName,
      firm: m.firm,
      email: m.email,
      compatibility_score: m.compatibilityScore,
      thesis_match: m.thesisMatch,
    }))
    const { data, error } = await client.from('vc_matches').insert(rows).select()
    if (error) throw new Error(`insertVcMatches: ${error.message}`)
    return (data || []).map((r: any) => ({
      id: r.id,
      reportId: r.report_id,
      vcName: r.vc_name,
      firm: r.firm,
      email: r.email,
      compatibilityScore: r.compatibility_score,
      thesisMatch: r.thesis_match,
      outreachSentAt: r.outreach_sent_at ? new Date(r.outreach_sent_at).getTime() : undefined,
    })) as VcMatch[]
  },

  async getVcMatch(id) {
    const { data: row, error } = await client.from('vc_matches').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(`getVcMatch: ${error.message}`)
    if (!row) return null
    const r = row as any
    return {
      id: r.id,
      reportId: r.report_id,
      vcName: r.vc_name,
      firm: r.firm,
      email: r.email,
      compatibilityScore: r.compatibility_score,
      thesisMatch: r.thesis_match,
      outreachSentAt: r.outreach_sent_at ? new Date(r.outreach_sent_at).getTime() : undefined,
    } as VcMatch
  },

  async updateVcMatch(id, patch) {
    const update: Record<string, unknown> = {}
    if (patch.outreachSentAt !== undefined) update.outreach_sent_at = new Date(patch.outreachSentAt).toISOString()
    const { data, error } = await client.from('vc_matches').update(update).eq('id', id).select().maybeSingle()
    if (error || !data) return null
    const r = data as any
    return {
      id: r.id,
      reportId: r.report_id,
      vcName: r.vc_name,
      firm: r.firm,
      email: r.email,
      compatibilityScore: r.compatibility_score,
      thesisMatch: r.thesis_match,
      outreachSentAt: r.outreach_sent_at ? new Date(r.outreach_sent_at).getTime() : undefined,
    } as VcMatch
  },

  async listVcMatches(reportId) {
    const { data: rows, error } = await client
      .from('vc_matches')
      .select('*')
      .eq('report_id', reportId)
    if (error) throw new Error(`listVcMatches: ${error.message}`)
    return (rows || []).map((r: any) => ({
      id: r.id,
      reportId: r.report_id,
      vcName: r.vc_name,
      firm: r.firm,
      email: r.email,
      compatibilityScore: r.compatibility_score,
      thesisMatch: r.thesis_match,
      outreachSentAt: r.outreach_sent_at ? new Date(r.outreach_sent_at).getTime() : undefined,
    })) as VcMatch[]
  },

  /* ───── network / dna ───── */
  async listAllFounders() {
    const { data: rows, error } = await client.from('founders').select('*')
    if (error) throw new Error(`listAllFounders: ${error.message}`)
    return (rows || []).map((r) => rowToFounder(r as FounderRow))
  },

  /* ───── simulator sessions ───── */
  async createSimulatorSession(data) {
    const { data: row, error } = await client
      .from('simulator_sessions')
      .insert({
        report_id: data.reportId,
        questions: data.questions,
        answers: data.answers,
        final_score: data.finalScore,
      })
      .select()
      .single()
    if (error || !row) throw new Error(`createSimulatorSession: ${error?.message}`)
    const r = row as any
    return {
      id: r.id,
      reportId: r.report_id,
      questions: r.questions,
      answers: r.answers,
      finalScore: r.final_score,
      createdAt: new Date(r.created_at).getTime(),
    }
  },
  async listSimulatorSessions(reportId) {
    const { data: rows, error } = await client
      .from('simulator_sessions')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`listSimulatorSessions: ${error.message}`)
    return (rows || []).map((r: any) => ({
      id: r.id,
      reportId: r.report_id,
      questions: r.questions,
      answers: r.answers,
      finalScore: r.final_score,
      createdAt: new Date(r.created_at).getTime(),
    }))
  },

  async listAllReports() {
    const { data: rows, error } = await client.from('reports').select('*')
    if (error) throw new Error(`listAllReports: ${error.message}`)
    return (rows || []).map((r) => rowToReport(r as ReportRow))
  },

  /* ───── community benchmarks ───── */
  async communityBenchmarks() {
    const { data: rows, error } = await client
      .from('reports')
      .select('validation_score')
      .eq('status', 'complete')
      .gt('validation_score', 0)
    if (error) throw new Error(`communityBenchmarks: ${error.message}`)
    const scores = (rows || []).map((r: any) => r.validation_score as number)
    if (scores.length === 0) return { avgScore: 0, topDecile: 0, sampleSize: 0 }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const sorted = scores.slice().sort((a, b) => b - a)
    const topDecile = sorted[Math.floor(sorted.length * 0.1)] || sorted[0]
    return { avgScore: Math.round(avg * 10) / 10, topDecile, sampleSize: scores.length }
  },

  /* ───── email tracking ───── */
  async createEmailTracking(vcMatchId) {
    const token = randomUUID()
    const { data, error } = await client
      .from('email_tracking')
      .insert({ vc_match_id: vcMatchId, tracking_token: token })
      .select()
      .single()
    if (error || !data) throw new Error(`createEmailTracking: ${error?.message}`)
    return {
      id: (data as any).id,
      vcMatchId: (data as any).vc_match_id,
      trackingToken: (data as any).tracking_token,
    }
  },

  async recordEmailOpen(token) {
    await client
      .from('email_tracking')
      .update({ opened_at: new Date().toISOString() })
      .eq('tracking_token', token)
      .is('opened_at', null)
  },

  async recordEmailClick(token: string): Promise<void> {
    await client
      .from('email_tracking')
      .update({ clicked_at: new Date().toISOString() })
      .eq('tracking_token', token)
      .is('clicked_at', null)
  },

  async recordEmailDelivered(token: string): Promise<void> {
    await client
      .from('email_tracking')
      .update({ delivered_at: new Date().toISOString() })
      .eq('tracking_token', token)
      .is('delivered_at', null)
  },

  async recordEmailBounced(token: string): Promise<void> {
    await client
      .from('email_tracking')
      .update({ bounced_at: new Date().toISOString() })
      .eq('tracking_token', token)
      .is('bounced_at', null)
  },

  async getEmailTrackingByToken(token: string): Promise<EmailTracking | null> {
    const { data } = await client
      .from('email_tracking')
      .select('*')
      .eq('tracking_token', token)
      .maybeSingle()
    if (!data) return null
    const r = data as any
    return {
      id: r.id,
      vcMatchId: r.vc_match_id,
      trackingToken: r.tracking_token,
      openedAt: r.opened_at ? new Date(r.opened_at).getTime() : undefined,
      clickedAt: r.clicked_at ? new Date(r.clicked_at).getTime() : undefined,
    }
  },

  async listEmailTrackingForReport(reportId) {
    // Join via vc_matches
    const { data: matches, error } = await client
      .from('vc_matches')
      .select('id')
      .eq('report_id', reportId)
    if (error) throw new Error(`listEmailTrackingForReport: ${error.message}`)
    const ids = (matches || []).map((m: any) => m.id)
    if (ids.length === 0) return []
    const { data: rows } = await client
      .from('email_tracking')
      .select('*')
      .in('vc_match_id', ids)
    return (rows || []).map((r: any) => ({
      id: r.id,
      vcMatchId: r.vc_match_id,
      trackingToken: r.tracking_token,
      openedAt: r.opened_at ? new Date(r.opened_at).getTime() : undefined,
      clickedAt: r.clicked_at ? new Date(r.clicked_at).getTime() : undefined,
      timeOnDeckSeconds: r.time_on_deck_seconds ?? undefined,
    })) as EmailTracking[]
  },
}
