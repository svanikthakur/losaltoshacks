import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, openAgentSocket } from '../lib/api'
import BorderGlow from '../components/BorderGlow'
import ScoreChart from '../components/ScoreChart'
import PivotCards from '../components/PivotCards'
import StressTest from '../components/StressTest'

const AGENT_DEFS = [
  { key: 'scout', name: 'Scout', tag: 'Market demand' },
  { key: 'atlas', name: 'Atlas', tag: 'Market analysis' },
  { key: 'forge', name: 'Forge', tag: 'MVP scaffold' },
  { key: 'deck', name: 'Deck', tag: 'Pitch deck' },
  { key: 'connect', name: 'Connect', tag: 'Investor list' },
]

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
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.getReport(id).then((r) => {
      setReport(r)
      if (r.status === 'complete') {
        setStatuses({
          scout: 'complete',
          atlas: 'complete',
          forge: 'complete',
          deck: 'complete',
          connect: 'complete',
        })
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
      }
    })
    return () => ws.close()
  }, [id])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [logs])

  if (!report) {
    return (
      <main className="pt-40 min-h-screen">
        <div className="shell text-ink-dim">Loading…</div>
      </main>
    )
  }

  const progress = Object.values(statuses).filter((s) => s === 'complete').length

  return (
    <main className="pt-32 pb-24 min-h-screen">
      <div className="shell">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-6 text-sm text-ink-dim">
            <span className="flex items-center gap-2">
              {progress < 5 && <span className="live-dot" />}
              <span className={progress === 5 ? 'text-ink' : 'text-accent'}>
                {progress}/5 complete
              </span>
            </span>
            <span className="text-muted">·</span>
            <span className="font-mono">#{id.slice(0, 8)}</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl leading-[1.05] tracking-display font-medium max-w-4xl">
            {report.idea}
          </h1>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Agents */}
          <section className="lg:col-span-2 space-y-4">
            {AGENT_DEFS.map((a, i) => (
              <AgentRow
                key={a.key}
                def={a}
                index={i}
                status={statuses[a.key]}
                output={report[`${a.key}_output`]}
              />
            ))}

            {/* Score history chart + collision badge */}
            {progress === 5 && <PostPipelineExtras report={report} reportId={id} />}
          </section>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-28 self-start">
            <BorderGlow
              backgroundColor="#0C0F15"
              borderRadius={14}
              glowRadius={36}
              glowColor="120 100 50"
              colors={['#00FF41', '#34D399', '#A7F3D0']}
              edgeSensitivity={20}
            >
              <div className="overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-line">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="live-dot" />
                    <span className="font-medium">Live feed</span>
                  </div>
                  <div className="label">websocket</div>
                </div>
                <div
                  ref={logRef}
                  className="h-72 overflow-y-auto px-5 py-4 font-mono text-xs space-y-1.5"
                  style={{ background: 'rgba(7,9,13,0.8)' }}
                >
                  {logs.length === 0 && <div className="text-muted">Waiting for agents…</div>}
                  <AnimatePresence initial={false}>
                    {logs.map((l, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex gap-2"
                      >
                        <span className="text-muted shrink-0">{new Date(l.ts).toLocaleTimeString('en-GB')}</span>
                        <span className="text-accent shrink-0">{l.agent}</span>
                        <span className="text-ink-dim">{l.msg}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </BorderGlow>

            <BorderGlow
              backgroundColor="#0C0F15"
              borderRadius={14}
              glowRadius={36}
              glowColor="120 100 50"
              colors={['#00FF41', '#34D399', '#A7F3D0']}
              edgeSensitivity={20}
            >
              <div className="p-6">
                <div className="label mb-4">Downloads</div>
                <div className="space-y-1">
                  <ExportRow label="Validation report" url={report.pdf_report_url} ext="PDF" />
                  <ExportRow label="Market analysis" url={report.pdf_report_url} ext="PDF" />
                  <ExportRow label="Pitch deck" url={report.pitch_deck_url} ext="PPTX" />
                  <ExportRow label="MVP repository" url={report.github_repo_url} ext="GIT" />
                  <ExportRow label="Investor list" url={report.investor_sheet_url} ext="SHEET" />
                </div>
              </div>
            </BorderGlow>
          </aside>
        </div>
      </div>
    </main>
  )
}

function AgentRow({
  def,
  index,
  status,
  output,
}: {
  def: (typeof AGENT_DEFS)[number]
  index: number
  status: Status
  output: any
}) {
  const running = status === 'running'
  const done = status === 'complete'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <BorderGlow
        backgroundColor="#0C0F15"
        borderRadius={14}
        glowRadius={36}
        glowColor="120 100 50"
        colors={['#00FF41', '#34D399', '#A7F3D0']}
        edgeSensitivity={20}
        animated={done && index === 0}
      >
        <article className={`p-6 relative ${running ? 'ring-1 ring-accent/40' : ''}`}>
          <div className="flex items-start justify-between gap-6 mb-4">
            <div>
              <div className="label mb-2">
                {String(index + 1).padStart(2, '0')} / {def.tag}
              </div>
              <h3 className="font-display text-2xl font-semibold tracking-tight">{def.name}</h3>
            </div>
            <StatusPill status={status} />
          </div>
          {done && output ? (
            <AgentOutput agent={def.key} output={output} />
          ) : running ? (
            <div className="text-sm text-accent">Running…</div>
          ) : (
            <div className="text-sm text-muted">Queued</div>
          )}
        </article>
      </BorderGlow>
    </motion.div>
  )
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, [string, string]> = {
    pending: ['Queued', 'text-muted'],
    running: ['Running', 'text-accent'],
    complete: ['Complete', 'text-ink-dim'],
    error: ['Error', 'text-accent'],
  }
  const [label, cls] = map[status]
  return (
    <div className={`flex items-center gap-2 text-xs font-medium ${cls}`}>
      {status === 'running' && <span className="live-dot" />}
      {label}
    </div>
  )
}

function AgentOutput({ agent, output }: { agent: string; output: any }) {
  if (agent === 'scout') {
    return (
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm text-ink-dim mb-2">
            <span>Demand score</span>
            <span className="font-mono">{output.demandScore}/10</span>
          </div>
          <div className="h-1 rounded-full bg-line overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(output.demandScore || 0) * 10}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-accent"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(output.painPoints || []).map((p: string, i: number) => (
            <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-surface border border-line text-ink-dim">
              {p}
            </span>
          ))}
        </div>
      </div>
    )
  }
  if (agent === 'atlas') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {['tam', 'sam', 'som'].map((k) => (
            <div key={k} className="bg-surface border border-line rounded-md p-3">
              <div className="label mb-1">{k.toUpperCase()}</div>
              <div className="font-display text-xl font-semibold">{output[k] || '—'}</div>
            </div>
          ))}
        </div>
        <p className="text-sm text-ink-dim">{output.icp}</p>
      </div>
    )
  }
  if (agent === 'forge') {
    return (
      <div className="space-y-3">
        <a
          href={output.repoUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-accent hover:underline break-all"
        >
          {output.repoUrl}
        </a>
        <div className="flex flex-wrap gap-2">
          {(output.techStack || []).map((t: string) => (
            <span key={t} className="text-xs px-3 py-1.5 rounded-full bg-surface border border-line">
              {t}
            </span>
          ))}
        </div>
      </div>
    )
  }
  if (agent === 'deck') {
    return (
      <div className="text-sm text-ink-dim">
        12 slides ready ·{' '}
        <a href={output.pptxUrl} className="text-accent hover:underline">
          download .pptx
        </a>
      </div>
    )
  }
  if (agent === 'connect') {
    return (
      <div className="space-y-2">
        {(output.investors || []).slice(0, 4).map((inv: any, i: number) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-ink">{inv.name}</span>
            <span className="text-xs text-ink-dim">{inv.thesis}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

function ExportRow({ label, url, ext }: { label: string; url?: string; ext: string }) {
  const disabled = !url
  return (
    <a
      href={url || '#'}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => disabled && e.preventDefault()}
      className={`flex items-center justify-between py-3 group ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:text-accent transition-colors duration-fast'
      }`}
    >
      <span className="text-sm">{label}</span>
      <span className="text-xs font-mono text-muted group-hover:text-accent transition-colors">{ext}</span>
    </a>
  )
}

/* ================================================================
   PostPipelineExtras — score chart, collision badge, action buttons,
   pivot engine (auto if score < 6), stress test modal
   ================================================================ */
function PostPipelineExtras({ report, reportId }: { report: any; reportId: string }) {
  const [history, setHistory] = useState<{ score: number; recordedAt: number }[]>([])
  const [showStressTest, setShowStressTest] = useState(false)
  const collision = report?.scout_output?.collisionScore
  const angles = (report?.scout_output?.differentiationAngles as string[]) || []

  useEffect(() => {
    api
      .getScoreHistory(reportId)
      .then((r) => setHistory(r.history || []))
      .catch(() => {})
  }, [reportId])

  return (
    <div className="space-y-6 mt-2">
      {/* Score chart */}
      <BorderGlow
        backgroundColor="#0C0F15"
        borderRadius={14}
        glowRadius={36}
        glowColor="120 100 50"
        colors={['#00FF41', '#34D399', '#A7F3D0']}
        edgeSensitivity={20}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-charge)' }}>
                // VALIDATION SCORE OVER TIME
              </div>
              <div className="text-xs text-muted mt-1">
                Auto-tracked. Re-run validation to update the line.
              </div>
            </div>
            <div className="font-mono text-2xl" style={{ color: 'var(--color-charge)' }}>
              {report.validation_score}/10
            </div>
          </div>
          <ScoreChart history={history} />
        </div>
      </BorderGlow>

      {/* Collision detection */}
      {collision !== undefined && (
        <BorderGlow
          backgroundColor="#0C0F15"
          borderRadius={14}
          glowRadius={36}
          glowColor="120 100 50"
          colors={['#00FF41', '#34D399', '#A7F3D0']}
          edgeSensitivity={20}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-charge)' }}>
                  // COLLISION DETECTION
                </div>
                <div className="text-xs text-muted mt-1">
                  How crowded is this market? 0 = wide open · 100 = elbow to elbow
                </div>
              </div>
              <div
                className="font-display text-4xl font-bold tracking-tight"
                style={{
                  color: collision < 30 ? '#00FF41' : collision < 60 ? '#FBBF24' : '#FB7185',
                }}
              >
                {collision}
              </div>
            </div>
            {angles.length > 0 && (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted mb-2">
                  ›  3 angles nobody is taking
                </div>
                <ul className="space-y-1.5 text-sm text-ink-dim">
                  {angles.map((a, i) => (
                    <li key={i} className="flex items-baseline gap-2">
                      <span className="text-accent">›</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </BorderGlow>
      )}

      {/* Action buttons */}
      <BorderGlow
        backgroundColor="#0C0F15"
        borderRadius={14}
        glowRadius={36}
        glowColor="120 100 50"
        colors={['#00FF41', '#34D399', '#A7F3D0']}
        edgeSensitivity={20}
      >
        <div className="p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--color-charge)' }}>
            // NEXT ACTIONS
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <button onClick={() => setShowStressTest(true)} className="btn-ghost justify-center">
              Investor stress test ↗
            </button>
            <Link to={`/timeline/${reportId}`} className="btn-ghost justify-center">
              Fundraising timeline ↗
            </Link>
            <Link to={`/launchkit/${reportId}`} className="btn-ghost justify-center">
              Launch kit ↗
            </Link>
            <Link to={`/investors/${reportId}`} className="btn-ghost justify-center">
              VC tracking ↗
            </Link>
          </div>
        </div>
      </BorderGlow>

      {/* Pivot engine — auto-shown when score < 6 */}
      {report.validation_score < 6 && (
        <BorderGlow
          backgroundColor="#0C0F15"
          borderRadius={14}
          glowRadius={36}
          glowColor="120 100 50"
          colors={['#00FF41', '#34D399', '#A7F3D0']}
          edgeSensitivity={20}
        >
          <div className="p-6">
            <PivotCards reportId={reportId} />
          </div>
        </BorderGlow>
      )}

      {showStressTest && <StressTest reportId={reportId} onClose={() => setShowStressTest(false)} />}
    </div>
  )
}
