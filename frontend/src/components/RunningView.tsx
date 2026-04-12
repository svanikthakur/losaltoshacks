/**
 * RunningView — full-screen agent execution view shown while the pipeline runs.
 *
 * Big animated agent status grid + live log stream + a dramatic
 * "VIEW DASHBOARD" CTA that appears the moment all 5 agents complete.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import BorderGlow from './BorderGlow'

type Status = 'pending' | 'running' | 'complete' | 'error'

const AGENT_DEFS = [
  { key: 'scout', name: 'SCOUT', tag: 'Market intelligence' },
  { key: 'atlas', name: 'ATLAS', tag: 'Strategic plan' },
  { key: 'forge', name: 'FORGE', tag: 'MVP scaffold' },
  { key: 'deck', name: 'DECK', tag: 'Pitch deck' },
  { key: 'connect', name: 'CONNECT', tag: 'Investor outreach' },
] as const

interface Log {
  agent: string
  msg: string
  ts: number
}

export default function RunningView({
  idea,
  statuses,
  logs,
  fatalError,
  onViewDashboard,
}: {
  idea: string
  statuses: Record<string, Status>
  logs: Log[]
  fatalError: string | null
  onViewDashboard: () => void
}) {
  const logRef = useRef<HTMLDivElement>(null)
  const completed = AGENT_DEFS.filter((a) => statuses[a.key] === 'complete').length
  const allDone = completed === AGENT_DEFS.length

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [logs])

  return (
    <main className="pt-32 pb-24 min-h-screen">
      <div className="shell">
        {/* Brief */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--color-charge)' }}>
            // VALIDATION RUNTIME
          </div>
          <h1 className="font-display text-3xl md:text-5xl uppercase font-bold tracking-[-0.02em] leading-[0.95] max-w-4xl mb-10">
            {idea}
          </h1>
        </motion.div>

        {/* CTA banner — only when complete */}
        <AnimatePresence>
          {allDone && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-10"
            >
              <button
                onClick={onViewDashboard}
                className="w-full p-6 flex items-center justify-between font-mono uppercase tracking-[0.18em] text-sm transition-all hover:scale-[1.005]"
                style={{
                  background: 'var(--color-charge)',
                  color: 'var(--color-void)',
                  border: '1px solid var(--color-charge)',
                  boxShadow: '0 24px 80px -16px rgba(0,255,65,0.45)',
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="w-3 h-3 rounded-full bg-[var(--color-void)]" />
                  <span className="text-base font-bold">PIPELINE COMPLETE</span>
                  <span className="opacity-70">·  All 5 agents reported in</span>
                </div>
                <div className="flex items-center gap-3 font-bold">
                  VIEW DASHBOARD
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fatal error banner */}
        {fatalError && (
          <div
            className="mb-10 p-5 font-mono text-sm border"
            style={{
              background: 'rgba(251,113,133,0.05)',
              borderColor: 'rgba(251,113,133,0.4)',
              color: '#FB7185',
            }}
          >
            <div className="font-semibold mb-2">⚠ Pipeline failed</div>
            <div className="text-ink-dim text-xs leading-relaxed">{fatalError}</div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT — agent status grid */}
          <section className="lg:col-span-2 space-y-4">
            {AGENT_DEFS.map((a) => (
              <AgentCard key={a.key} def={a} status={statuses[a.key]} />
            ))}
          </section>

          {/* RIGHT — live wire */}
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
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border-1)]">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="live-dot" />
                    <span className="font-medium">Live wire</span>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">tty/ws</div>
                </div>
                <div
                  ref={logRef}
                  className="h-[480px] overflow-y-auto px-5 py-4 font-mono text-[11px] space-y-1.5"
                  style={{ background: 'rgba(7,9,13,0.85)' }}
                >
                  {logs.length === 0 && (
                    <div className="text-muted">
                      <span className="text-accent">&gt;</span> standing by…
                    </div>
                  )}
                  <AnimatePresence initial={false}>
                    {logs.map((l, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex gap-2"
                      >
                        <span className="text-muted shrink-0">
                          {new Date(l.ts).toLocaleTimeString('en-GB')}
                        </span>
                        <span className="text-accent shrink-0">{l.agent}</span>
                        <span className="text-ink-dim">{l.msg}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="px-5 py-2.5 border-t border-[var(--color-border-1)] flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
                  <span>{completed} / 5 complete</span>
                  <span>{logs.length} log lines</span>
                </div>
              </div>
            </BorderGlow>
          </aside>
        </div>
      </div>
    </main>
  )
}

function AgentCard({ def, status }: { def: (typeof AGENT_DEFS)[number]; status: Status }) {
  const running = status === 'running'
  const done = status === 'complete'
  const errored = status === 'error'

  const width = done ? '100%' : errored ? '100%' : running ? '85%' : '0%'
  const barColor = errored ? '#FB7185' : 'var(--color-charge)'
  const barDuration = done ? 0.4 : running ? 8 : 0.2

  return (
    <BorderGlow
      backgroundColor="#0C0F15"
      borderRadius={14}
      glowRadius={36}
      glowColor="120 100 50"
      colors={['#00FF41', '#34D399', '#A7F3D0']}
      edgeSensitivity={20}
    >
      <div className="p-7 relative overflow-hidden">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 transition-[width] duration-500"
          style={{
            width: running || done ? '3px' : '0',
            background: errored ? '#FB7185' : 'var(--color-charge)',
          }}
        />

        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted mb-2">
              {def.tag}
            </div>
            <h3 className="font-display text-3xl font-bold uppercase tracking-[-0.02em] leading-none">
              {def.name}
            </h3>
          </div>
          <StatusPill status={status} />
        </div>

        <div className="mt-5 h-[3px] rounded-full relative overflow-hidden" style={{ background: 'rgba(0,255,65,0.10)' }}>
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            animate={{ width }}
            transition={{ duration: barDuration, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: barColor }}
          />
          {done && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              style={{ background: 'var(--color-charge)', filter: 'blur(6px)' }}
            />
          )}
        </div>
      </div>
    </BorderGlow>
  )
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, [string, string]> = {
    pending: ['QUEUED', '#5C6075'],
    running: ['RUNNING', '#00FF41'],
    complete: ['COMPLETE', '#A7F3D0'],
    error: ['ERROR', '#FB7185'],
  }
  const [label, color] = map[status]
  return (
    <div
      className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-1.5"
      style={{ color, border: `1px solid ${color}66`, background: `${color}0d` }}
    >
      {status === 'running' && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />}
      {label}
    </div>
  )
}
