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
  signup: (data: { email: string; password: string; name: string }) =>
    req<{ token: string; user: any }>('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    req<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => req<any>('/founder/profile'),
  updateProfile: (data: any) =>
    req<any>('/founder/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  listReports: () => req<any[]>('/founder/validations'),
  generate: (data: { idea: string; category?: string }) =>
    req<{ reportId: string }>('/reports/generate', { method: 'POST', body: JSON.stringify(data) }),
  getReport: (id: string) => req<any>(`/reports/${id}`),
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
