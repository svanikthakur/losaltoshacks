const BASE = '/api'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('ac_token')
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  /* auth */
  signup: (data: { email: string; password: string; name: string }) =>
    req<{ token: string; user: any }>('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    req<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  /* founder + dna */
  me: () => req<any>('/founder/profile'),
  updateProfile: (data: any) => req<any>('/founder/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  listReports: () => req<any[]>('/founder/validations'),
  getDNA: () => req<any>('/dna'),
  putDNA: (data: any) => req<any>('/dna', { method: 'PUT', body: JSON.stringify(data) }),

  /* reports */
  generate: (data: { idea: string; category?: string }) =>
    req<{ reportId: string }>('/reports/generate', { method: 'POST', body: JSON.stringify(data) }),
  getReport: (id: string) => req<any>(`/reports/${id}`),
  getScoreHistory: (id: string) => req<{ score: number; history: any[] }>(`/reports/${id}/score`),
  regenerate: (reportId: string, agent?: 'scout' | 'atlas' | 'forge' | 'deck' | 'connect') =>
    req<{ reportId: string; agent: string }>(`/reports/${reportId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify(agent ? { agent } : {}),
    }),

  /* network + community */
  getMatches: () => req<{ matches: any[] }>('/network/matches'),
  getBenchmarks: () => req<{ avgScore: number; topDecile: number; sampleSize: number; synthetic?: boolean }>('/community/benchmarks'),

  /* pivot engine */
  generatePivots: (reportId: string) =>
    req<{ pivots: any[] }>('/pivot/generate', { method: 'POST', body: JSON.stringify({ reportId }) }),

  /* simulator */
  simulatorStart: (reportId: string) =>
    req<{ questions: { q: string; rubric: string }[] }>('/simulator/start', {
      method: 'POST',
      body: JSON.stringify({ reportId }),
    }),
  simulatorScore: (reportId: string, questions: any[], answers: string[]) =>
    req<{ answers: any[]; finalScore: number; summary: string; sessionId: string }>('/simulator/score', {
      method: 'POST',
      body: JSON.stringify({ reportId, questions, answers }),
    }),
  simulatorList: (reportId: string) =>
    req<{ sessions: any[] }>(`/simulator/${reportId}`),

  /* timeline */
  generateTimeline: (reportId: string, stage: 'idea' | 'mvp' | 'revenue') =>
    req<{ weeks: any[] }>('/timeline/generate', {
      method: 'POST',
      body: JSON.stringify({ reportId, stage }),
    }),

  /* launch kit */
  generateLaunchKit: (reportId: string) =>
    req<any>('/launchkit/generate', {
      method: 'POST',
      body: JSON.stringify({ reportId }),
    }),

  /* investors */
  getInvestorTracking: (reportId: string) => req<{ tracking: any[]; matches: any[] }>(`/investors/tracking/${reportId}`),
  getRankedInvestors: (reportId: string) => req<{ ranked: any[] }>(`/investors/ranked/${reportId}`),
}

export function openAgentSocket(reportId: string, onEvent: (e: any) => void) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${location.host}/ws/agent/${reportId}`)
  ws.onmessage = (ev) => {
    try {
      onEvent(JSON.parse(ev.data))
    } catch {}
  }
  return ws
}
