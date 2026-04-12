/**
 * Report — controller. Picks between RunningView and DashboardView.
 *
 *  - While the pipeline is running OR the user just landed → RunningView
 *  - When all 5 agents complete and the user clicks "VIEW DASHBOARD" → DashboardView
 *  - On reload of a completed report, jumps straight to DashboardView
 */
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, openAgentSocket } from '../lib/api'
import RunningView from '../components/RunningView'
import DashboardView from '../components/DashboardView'
import ErrorBoundary from '../components/ErrorBoundary'

type Status = 'pending' | 'running' | 'complete' | 'error'

export default function Report() {
  const { id = '' } = useParams()
  const [report, setReport] = useState<any>(null)
  const [statuses, setStatuses] = useState<Record<string, Status>>({
    scout: 'pending',
    atlas: 'pending',
    forge: 'pending',
    deck: 'pending',
    connect: 'pending',
  })
  const [logs, setLogs] = useState<{ agent: string; msg: string; ts: number }[]>([])
  const [fatalError, setFatalError] = useState<string | null>(null)
  const [view, setView] = useState<'running' | 'dashboard'>('running')

  useEffect(() => {
    api.getReport(id).then((r) => {
      setReport(r)
      // If the user is opening a previously completed report, skip the running view
      if (r.status === 'complete') {
        setStatuses({
          scout: 'complete',
          atlas: 'complete',
          forge: 'complete',
          deck: 'complete',
          connect: 'complete',
        })
        setView('dashboard')
      }
    })

    const ws = openAgentSocket(id, (e) => {
      if (e.type === 'log') {
        setLogs((l) => [...l, { agent: e.agent, msg: e.msg, ts: Date.now() }])
      } else if (e.type === 'status') {
        setStatuses((s) => ({ ...s, [e.agent]: e.status }))
        if (e.status === 'complete' && e.output) {
          setReport((r: any) => (r ? { ...r, [`${e.agent}_output`]: e.output } : r))
        }
      } else if (e.type === 'complete') {
        api.getReport(id).then(setReport)
      } else if (e.type === 'error') {
        setFatalError(e.msg || 'pipeline failed')
        setStatuses((s) => {
          const next = { ...s }
          for (const k of Object.keys(next)) {
            if (next[k] === 'running' || next[k] === 'pending') next[k] = 'error'
          }
          return next
        })
      }
    })
    ws.onclose = () => {
      setTimeout(() => api.getReport(id).then(setReport).catch(() => {}), 200)
    }
    return () => ws.close()
  }, [id])

  if (!report) {
    return (
      <main className="pt-40 min-h-screen">
        <div className="shell text-ink-dim font-mono text-xs uppercase tracking-[0.18em]">
          › loading dispatch…
        </div>
      </main>
    )
  }

  if (view === 'dashboard') {
    return (
      <ErrorBoundary>
        <DashboardView report={report} />
      </ErrorBoundary>
    )
  }

  return (
    <RunningView
      idea={report.idea}
      statuses={statuses}
      logs={logs}
      fatalError={fatalError}
      onViewDashboard={() => setView('dashboard')}
    />
  )
}
