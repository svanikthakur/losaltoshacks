import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import BorderGlow from '../components/BorderGlow'

interface Milestone {
  week: number
  title: string
  category: 'narrative' | 'outreach' | 'product' | 'meetings' | 'close'
  subtasks: string[]
}

const CATEGORY_COLOR: Record<Milestone['category'], string> = {
  narrative: '#A7F3D0',
  outreach: '#34D399',
  product: '#00FF41',
  meetings: '#FBBF24',
  close: '#FB7185',
}

export default function Timeline() {
  const { reportId = '' } = useParams()
  const [stage, setStage] = useState<'idea' | 'mvp' | 'revenue'>('mvp')
  const [weeks, setWeeks] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<Set<number>>(new Set())

  const generate = async () => {
    setLoading(true)
    setErr(null)
    try {
      const r = await api.generateTimeline(reportId, stage)
      setWeeks(r.weeks || [])
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  const toggle = (w: number) => {
    setDone((d) => {
      const n = new Set(d)
      if (n.has(w)) n.delete(w)
      else n.add(w)
      return n
    })
  }

  const exportCsv = () => {
    const csv = [
      ['week', 'title', 'category', 'subtasks'],
      ...weeks.map((w) => [w.week, w.title, w.category, w.subtasks.join(' | ')]),
    ]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timeline-${reportId.slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="pt-32 pb-24 min-h-screen">
      <div className="shell">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--color-charge)' }}>
          // FUNDRAISING TIMELINE
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold uppercase tracking-tight leading-[0.92]">
          12-week <span style={{ color: 'var(--color-charge)' }}>roadmap.</span>
        </h1>
        <p className="mt-5 text-ink-dim text-lg max-w-xl">
          A week-by-week plan from cold-start to first close. Personalized to your stage, location, and time budget.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <div className="flex gap-1">
            {(['idea', 'mvp', 'revenue'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStage(s)}
                className="font-mono text-[10px] uppercase tracking-[0.15em] px-3 py-2"
                style={{
                  background: stage === s ? 'var(--color-charge)' : 'transparent',
                  color: stage === s ? 'var(--color-void)' : 'var(--color-text-2)',
                  border: '1px solid',
                  borderColor: stage === s ? 'var(--color-charge)' : 'rgba(0,255,65,0.18)',
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <button onClick={generate} disabled={loading} className="btn">
            {loading ? 'Generating…' : weeks.length ? 'Regenerate' : 'Generate'} <span className="arrow">↗</span>
          </button>
          {weeks.length > 0 && (
            <button onClick={exportCsv} className="btn-ghost">
              Export CSV
            </button>
          )}
        </div>

        {err && <div className="mt-6 font-mono text-xs text-warn">› {err}</div>}

        <div className="mt-12 space-y-3">
          {weeks.map((w) => (
            <BorderGlow
              key={w.week}
              backgroundColor="#0C0F15"
              borderRadius={10}
              glowRadius={28}
              glowColor="120 100 50"
              colors={['#00FF41', '#34D399', '#A7F3D0']}
              edgeSensitivity={20}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <button
                      onClick={() => toggle(w.week)}
                      className="w-5 h-5 mt-1 border flex items-center justify-center"
                      style={{
                        borderColor: 'var(--color-charge)',
                        background: done.has(w.week) ? 'var(--color-charge)' : 'transparent',
                        color: 'var(--color-void)',
                      }}
                    >
                      {done.has(w.week) && '✓'}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3 mb-2">
                        <span className="font-mono text-[10px] text-muted">WEEK {String(w.week).padStart(2, '0')}</span>
                        <span
                          className="font-mono text-[9px] uppercase tracking-[0.12em] px-2 py-0.5"
                          style={{
                            background: `${CATEGORY_COLOR[w.category]}22`,
                            color: CATEGORY_COLOR[w.category],
                            border: `1px solid ${CATEGORY_COLOR[w.category]}55`,
                          }}
                        >
                          {w.category}
                        </span>
                      </div>
                      <h3
                        className="font-display text-xl font-semibold"
                        style={{ textDecoration: done.has(w.week) ? 'line-through' : 'none', opacity: done.has(w.week) ? 0.5 : 1 }}
                      >
                        {w.title}
                      </h3>
                      <ul className="mt-3 space-y-1 text-xs text-ink-dim font-mono">
                        {w.subtasks.map((s, i) => (
                          <li key={i}>
                            <span className="text-muted">›</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </BorderGlow>
          ))}
        </div>
      </div>
    </main>
  )
}
