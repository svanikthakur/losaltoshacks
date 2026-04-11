import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import Reveal from '../components/Reveal'

export default function Dashboard() {
  const { user } = useAuth()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .listReports()
      .then(setReports)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="pt-32 pb-24 min-h-screen">
      <div className="shell">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-end justify-between flex-wrap gap-6 mb-12"
        >
          <div>
            <div className="eyebrow mb-4">Welcome back, {user?.name?.split(' ')[0] || 'founder'}</div>
            <h1 className="font-display text-5xl md:text-6xl leading-[0.95] tracking-display font-medium">
              Your validations
            </h1>
          </div>
          <Link to="/validate" className="btn">
            New validation <span className="arrow">→</span>
          </Link>
        </motion.div>

        {loading ? (
          <div className="card p-16 text-center text-ink-dim">Loading…</div>
        ) : reports.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((r, i) => (
              <Reveal key={r.id} delay={i * 60}>
                <Link to={`/report/${r.id}`}>
                  <ReportCard r={r} />
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card p-16 text-center"
    >
      <h2 className="font-display text-3xl md:text-4xl font-medium tracking-tight">
        No validations yet
      </h2>
      <p className="mt-4 text-ink-dim max-w-md mx-auto text-lg">
        Drop an idea — five agents will return a pitch deck, market map, MVP repo and investor list in under ten minutes.
      </p>
      <div className="mt-10">
        <Link to="/validate" className="btn">
          Validate your first idea <span className="arrow">→</span>
        </Link>
      </div>
    </motion.div>
  )
}

function ReportCard({ r }: { r: any }) {
  const statusLabel: Record<string, string> = {
    complete: 'Complete',
    processing: 'Running',
    pending: 'Queued',
    error: 'Error',
  }
  const statusColor: Record<string, string> = {
    complete: 'text-ink-dim',
    processing: 'text-accent',
    pending: 'text-muted',
    error: 'text-accent',
  }
  return (
    <div className="card card-hover p-7 h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="label">{r.category || 'Uncategorised'}</div>
        <div className={`text-xs font-medium flex items-center gap-2 ${statusColor[r.status] || 'text-ink-dim'}`}>
          {r.status === 'processing' && <span className="live-dot" />}
          {statusLabel[r.status] || r.status}
        </div>
      </div>
      <h3 className="font-display text-xl font-semibold tracking-tight leading-snug line-clamp-3">
        {r.idea}
      </h3>
      {r.validation_score != null && (
        <div className="mt-6">
          <div className="flex justify-between text-xs text-ink-dim mb-2">
            <span>Validation score</span>
            <span className="font-mono">{r.validation_score}/10</span>
          </div>
          <div className="h-1 rounded-full bg-line overflow-hidden">
            <div
              className="h-full bg-accent"
              style={{ width: `${r.validation_score * 10}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
