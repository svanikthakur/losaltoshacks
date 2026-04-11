/** Shared types for the backend. */

export type ReportStatus = 'pending' | 'running' | 'complete' | 'failed'

export interface Founder {
  id: string
  email: string
  name: string
  passwordHash: string
  skills: string[]
  location?: string
  industryFocus?: string
  riskTolerance?: 'low' | 'medium' | 'high'
  networkSize?: number
  createdAt: number
}

export interface Report {
  id: string
  founderId: string
  ideaText: string
  validationScore: number
  status: ReportStatus
  scout_output?: unknown
  atlas_output?: unknown
  forge_output?: unknown
  deck_output?: unknown
  connect_output?: unknown
  // export URLs
  pdf_report_url?: string
  pitch_deck_url?: string
  github_repo_url?: string
  investor_sheet_url?: string
  deck_url?: string
  notion_url?: string
  createdAt: number
}

export interface ScoreHistoryEntry {
  id: string
  reportId: string
  score: number
  recordedAt: number
}

export interface VcMatch {
  id: string
  reportId: string
  vcName: string
  firm: string
  email?: string
  compatibilityScore: number
  thesisMatch?: string
  outreachSentAt?: number
}

export interface EmailTracking {
  id: string
  vcMatchId: string
  trackingToken: string
  openedAt?: number
  clickedAt?: number
  timeOnDeckSeconds?: number
}
