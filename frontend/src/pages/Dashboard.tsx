/**
 * Dashboard — real data only, glassmorphic widgets, per-agent regenerate.
 *
 * All numbers come from the latest real report pulled from the backend
 * (LocalStorage holds the JWT; the backend persists reports). If no report
 * exists, show a clean empty state.
 */
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

type AgentName = 'scout' | 'atlas' | 'forge' | 'deck' | 'connect'
type AgentStatus = 'complete' | 'pending' | 'running' | 'error'

interface ReportRow {
  id: string
  idea: string
  status: string
  validation_score: number | null
  scout_output: unknown
  atlas_output: unknown
  forge_output: unknown
  deck_output: unknown
  connect_output: unknown
  createdAt: string | number
}

interface ScoutOut {
  collisionScore?: number
  demandLevel?: string
  competitors?: { name: string }[]
}
interface AtlasOut {
  opportunityScore?: number
  tam?: string
  launchRegion?: string
}
interface ConnectOut {
  investorReadinessScore?: number
  topVCs?: unknown[]
  fundraisingStrategy?: { amount?: string }
}

interface DnaStrength {
  score: number
  completeness: number
  history: number
  sessionCount: number
  missing: string[]
}
interface DNA {
  skills?: string[]
  riskScore?: number
  networkSize?: number
  hoursPerWeek?: number
  priorStartups?: number
  location?: string
  strength?: DnaStrength
}

function fadeIn(i: number) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  }
}

export default function Dashboard() {
  const { user } = useAuth()
  const [reports, setReports] = useState<ReportRow[] | null>(null)
  const [latest, setLatest] = useState<ReportRow | null>(null)
  const [dna, setDna] = useState<DNA | null>(null)
  const [busy, setBusy] = useState<Record<AgentName, boolean>>({
    scout: false, atlas: false, forge: false, deck: false, connect: false,
  })

  const loadData = useCallback(async () => {
    const [list, dnaRes] = await Promise.all([
      api.listReports().catch(() => [] as ReportRow[]),
      api.getDNA().catch(() => null as DNA | null),
    ])
    setReports(list as ReportRow[])
    setDna(dnaRes as DNA | null)
    const completed = (list as ReportRow[]).find((r) => r.status === 'complete')
    if (completed) {
      const full = await api.getReport(completed.id).catch(() => null)
      setLatest((full as ReportRow) || completed)
    } else if (list.length) {
      const r = list[0] as ReportRow
      const full = await api.getReport(r.id).catch(() => null)
      setLatest((full as ReportRow) || r)
    } else {
      setLatest(null)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const regenerate = useCallback(
    async (agent: AgentName) => {
      if (!latest) return
      setBusy((b) => ({ ...b, [agent]: true }))
      try {
        await api.regenerate(latest.id, agent)
        // Poll the report until that agent's output refreshes
        const start = Date.now()
        const key = `${agent}_output` as keyof ReportRow
        const initial = latest[key]
        while (Date.now() - start < 90_000) {
          await new Promise((r) => setTimeout(r, 1500))
          const r = (await api.getReport(latest.id).catch(() => null)) as ReportRow | null
          if (r && r[key] !== initial) {
            setLatest(r)
            break
          }
        }
      } finally {
        setBusy((b) => ({ ...b, [agent]: false }))
      }
    },
    [latest],
  )

  const loading = reports === null
  const hasAny = (reports || []).length > 0

  return (
    <main className="min-h-screen pt-28 pb-24 bg-[#0a0a0f] text-white">
      <div className="shell max-w-7xl mx-auto px-6">
        <Header name={user?.name?.split(' ')[0]} />

        {loading ? (
          <div className="mt-16 text-center text-white/70 font-mono text-sm">
            loading dashboard…
          </div>
        ) : !hasAny ? (
          <EmptyState />
        ) : (
          <Widgets
            latest={latest}
            dna={dna}
            busy={busy}
            onRegenerate={regenerate}
          />
        )}
      </div>
    </main>
  )
}

/* ───────────────────── header ───────────────────── */

function Header({ name }: { name?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-end justify-between flex-wrap gap-6 mb-10"
    >
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-400/70">
          // VENTURE AI · DASHBOARD
        </div>
        <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold tracking-tight">
          Welcome back{name ? `, ${name}` : ''}
        </h1>
      </div>
      <Link
        to="/validate"
        className="rounded-full px-5 py-2.5 text-sm font-medium bg-white text-black hover:bg-white/90 transition"
      >
        New validation →
      </Link>
    </motion.div>
  )
}

/* ───────────────────── empty state ───────────────────── */

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-20"
    >
      <div
        className="relative rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-16 text-center overflow-hidden"
        style={{ boxShadow: '0 0 80px rgba(34, 211, 238, 0.08)' }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at top, rgba(34,211,238,0.12), transparent 60%), radial-gradient(ellipse at bottom, rgba(168,85,247,0.1), transparent 60%)',
          }}
        />
        <div className="relative">
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-400/70 mb-4">
            // NO REPORTS YET
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
            Run your first validation
          </h2>
          <p className="mt-4 text-white/75 max-w-lg mx-auto">
            Five specialized agents will return a real pitch deck, market map,
            MVP scaffold and VC outreach list in under ten minutes.
          </p>
          <div className="mt-10">
            <Link
              to="/validate"
              className="inline-block rounded-full px-6 py-3 text-sm font-medium bg-white text-black hover:bg-white/90 transition"
            >
              Generate Your First Report →
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ───────────────────── widgets ───────────────────── */

function Widgets({
  latest,
  dna,
  busy,
  onRegenerate,
}: {
  latest: ReportRow | null
  dna: DNA | null
  busy: Record<AgentName, boolean>
  onRegenerate: (agent: AgentName) => void
}) {
  const scout = (latest?.scout_output || null) as ScoutOut | null
  const atlas = (latest?.atlas_output || null) as AtlasOut | null
  const connect = (latest?.connect_output || null) as ConnectOut | null

  const agentStatus: Record<AgentName, AgentStatus> = useMemo(() => {
    const s = (val: unknown, name: AgentName): AgentStatus => {
      if (busy[name]) return 'running'
      return val ? 'complete' : 'pending'
    }
    return {
      scout: s(latest?.scout_output, 'scout'),
      atlas: s(latest?.atlas_output, 'atlas'),
      forge: s(latest?.forge_output, 'forge'),
      deck: s(latest?.deck_output, 'deck'),
      connect: s(latest?.connect_output, 'connect'),
    }
  }, [latest, busy])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <motion.div {...fadeIn(0)}>
        <ValidationScoreCard
          latest={latest}
          onRegenerate={() => onRegenerate('atlas')}
          busy={busy.atlas}
        />
      </motion.div>

      <motion.div {...fadeIn(1)}>
        <PipelineCard statuses={agentStatus} onRegenerate={onRegenerate} busy={busy} />
      </motion.div>

      <motion.div {...fadeIn(2)}>
        <ScoreCard
          label="Market Opportunity"
          accent="cyan"
          score={atlas?.opportunityScore ?? null}
          max={100}
          sub={atlas?.tam ? `TAM ${atlas.tam}` : undefined}
          onRegenerate={() => onRegenerate('atlas')}
          busy={busy.atlas}
        />
      </motion.div>

      <motion.div {...fadeIn(3)}>
        <ScoreCard
          label="Collision Score"
          accent="purple"
          score={scout?.collisionScore ?? null}
          max={100}
          sub={scout?.competitors ? `${scout.competitors.length} competitors` : undefined}
          onRegenerate={() => onRegenerate('scout')}
          busy={busy.scout}
          invert
        />
      </motion.div>

      <motion.div {...fadeIn(4)}>
        <ScoreCard
          label="Investor Readiness"
          accent="cyan"
          score={connect?.investorReadinessScore ?? null}
          max={100}
          sub={connect?.fundraisingStrategy?.amount}
          onRegenerate={() => onRegenerate('connect')}
          busy={busy.connect}
        />
      </motion.div>

      <motion.div {...fadeIn(5)}>
        <DNARadarCard dna={dna} />
      </motion.div>
    </div>
  )
}

/* ───────────────────── glass card shell ───────────────────── */

function GlassCard({
  children,
  accent = 'cyan',
  className = '',
}: {
  children: React.ReactNode
  accent?: 'cyan' | 'purple'
  className?: string
}) {
  const glow =
    accent === 'cyan'
      ? '0 0 50px rgba(34,211,238,0.14), inset 0 0 1px rgba(34,211,238,0.4)'
      : '0 0 50px rgba(168,85,247,0.14), inset 0 0 1px rgba(168,85,247,0.4)'
  return (
    <div
      className={`relative rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 h-full overflow-hidden ${className}`}
      style={{ boxShadow: glow }}
    >
      {children}
    </div>
  )
}

function CardHeader({
  label,
  onRegenerate,
  busy,
  accent = 'cyan',
}: {
  label: string
  onRegenerate?: () => void
  busy?: boolean
  accent?: 'cyan' | 'purple'
}) {
  const color = accent === 'cyan' ? 'text-cyan-400/80' : 'text-purple-400/80'
  return (
    <div className="flex items-center justify-between mb-5">
      <div className={`font-mono text-[10px] uppercase tracking-[0.22em] ${color}`}>
        // {label}
      </div>
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          disabled={busy}
          className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/70 hover:text-white disabled:opacity-30 transition"
        >
          {busy ? 'regenerating…' : 'regenerate ↻'}
        </button>
      )}
    </div>
  )
}

/* ───────────────────── widget 1: validation score with trend ───────────────────── */

function ValidationScoreCard({
  latest,
  onRegenerate,
  busy,
}: {
  latest: ReportRow | null
  onRegenerate: () => void
  busy: boolean
}) {
  const [history, setHistory] = useState<{ score: number }[]>([])

  useEffect(() => {
    if (!latest) return
    api
      .getScoreHistory(latest.id)
      .then((r) => setHistory(r.history || []))
      .catch(() => setHistory([]))
  }, [latest])

  const score = latest?.validation_score ?? null
  const prev = history.length > 1 ? history[history.length - 2].score : null
  const trend =
    score !== null && prev !== null ? (score > prev ? 'up' : score < prev ? 'down' : 'flat') : 'flat'

  return (
    <GlassCard accent="cyan">
      <CardHeader
        label="LATEST VALIDATION"
        onRegenerate={onRegenerate}
        busy={busy}
        accent="cyan"
      />
      <div className="flex items-baseline gap-3">
        <div className="font-display text-6xl font-semibold text-white leading-none">
          {score !== null ? score : '—'}
        </div>
        <div className="font-mono text-white/70 text-lg">/10</div>
        {trend !== 'flat' && (
          <div
            className={`ml-auto font-mono text-xs ${
              trend === 'up' ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trend === 'up' ? '↑' : '↓'} {prev !== null && score !== null ? Math.abs(score - prev) : ''}
          </div>
        )}
      </div>
      <div className="mt-5 text-sm text-white/70 line-clamp-2">
        {latest?.idea || '—'}
      </div>
      <div className="mt-5 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-all"
          style={{ width: `${(score || 0) * 10}%` }}
        />
      </div>
    </GlassCard>
  )
}

/* ───────────────────── widget 2: pipeline ───────────────────── */

const AGENT_ORDER: { name: AgentName; label: string }[] = [
  { name: 'scout', label: 'Scout' },
  { name: 'atlas', label: 'Atlas' },
  { name: 'forge', label: 'Forge' },
  { name: 'deck', label: 'Deck' },
  { name: 'connect', label: 'Connect' },
]

function PipelineCard({
  statuses,
  onRegenerate,
  busy,
}: {
  statuses: Record<AgentName, AgentStatus>
  onRegenerate: (agent: AgentName) => void
  busy: Record<AgentName, boolean>
}) {
  return (
    <GlassCard accent="purple">
      <CardHeader label="AGENT PIPELINE" accent="purple" />
      <ul className="space-y-3">
        {AGENT_ORDER.map(({ name, label }) => {
          const s = statuses[name]
          const dot =
            s === 'complete'
              ? 'bg-emerald-400'
              : s === 'running'
              ? 'bg-cyan-400 animate-pulse'
              : s === 'error'
              ? 'bg-rose-400'
              : 'bg-white/20'
          return (
            <li key={name} className="flex items-center gap-3">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              <span className="text-sm text-white/80 w-20">{label}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/70">
                {s}
              </span>
              <button
                onClick={() => onRegenerate(name)}
                disabled={busy[name]}
                className="ml-auto text-[10px] font-mono uppercase tracking-[0.15em] text-white/70 hover:text-white disabled:opacity-30 transition"
              >
                {busy[name] ? '…' : '↻'}
              </button>
            </li>
          )
        })}
      </ul>
    </GlassCard>
  )
}

/* ───────────────────── widget 3-5: score card ───────────────────── */

function ScoreCard({
  label,
  accent,
  score,
  max,
  sub,
  onRegenerate,
  busy,
  invert = false,
}: {
  label: string
  accent: 'cyan' | 'purple'
  score: number | null
  max: number
  sub?: string
  onRegenerate: () => void
  busy: boolean
  invert?: boolean
}) {
  const pct = score !== null ? Math.max(0, Math.min(100, (score / max) * 100)) : 0
  const barColor =
    accent === 'cyan'
      ? 'from-cyan-400 to-cyan-200'
      : 'from-purple-400 to-fuchsia-300'
  return (
    <GlassCard accent={accent}>
      <CardHeader label={label} onRegenerate={onRegenerate} busy={busy} accent={accent} />
      <div className="flex items-baseline gap-3">
        <div className="font-display text-5xl font-semibold leading-none">
          {score !== null ? score : '—'}
        </div>
        <div className="font-mono text-white/70 text-sm">/ {max}</div>
      </div>
      <div className="mt-5 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all`}
          style={{
            width: `${invert ? 100 - pct : pct}%`,
          }}
        />
      </div>
      {sub && (
        <div className="mt-4 text-xs font-mono text-white/75 truncate">{sub}</div>
      )}
      {invert && score !== null && (
        <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.15em] text-white/60">
          lower is better
        </div>
      )}
    </GlassCard>
  )
}

/* ───────────────────── widget 6: DNA radar ───────────────────── */

function DNARadarCard({ dna }: { dna: DNA | null }) {
  if (!dna || !(dna.skills?.length)) {
    return (
      <GlassCard accent="purple">
        <CardHeader label="FOUNDER DNA" accent="purple" />
        <div className="flex flex-col items-center justify-center py-10">
          <div className="text-sm text-white/75 mb-4 text-center">
            No DNA profile yet.
          </div>
          <Link
            to="/dna"
            className="rounded-full px-4 py-2 text-xs font-medium bg-white text-black hover:bg-white/90 transition"
          >
            Build profile →
          </Link>
        </div>
      </GlassCard>
    )
  }
  const data = [
    { axis: 'Technical', value: clamp(count(dna.skills, ['eng', 'code', 'dev', 'backend', 'frontend', 'ml', 'ai', 'data']) * 3) },
    { axis: 'Design', value: clamp(count(dna.skills, ['design', 'ux', 'ui', 'brand', 'product']) * 3) },
    { axis: 'Business', value: clamp(count(dna.skills, ['sales', 'biz', 'ops', 'finance', 'legal', 'strategy']) * 3) },
    { axis: 'Marketing', value: clamp(count(dna.skills, ['marketing', 'growth', 'content', 'seo', 'community']) * 3) },
    { axis: 'Risk', value: (dna.riskScore || 3) * 2 },
    { axis: 'Network', value: clamp((dna.networkSize || 0) / 50) },
  ]

  const strength = dna.strength
  return (
    <GlassCard accent="purple">
      <CardHeader label="FOUNDER DNA" accent="purple" />
      {strength && (
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/60">
              signal strength
            </div>
            <div className="font-mono text-xs text-cyan-300">{strength.score}/100</div>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-400 to-fuchsia-300 transition-all"
              style={{ width: `${strength.score}%` }}
            />
          </div>
          <div className="mt-2 font-mono text-[10px] text-white/60">
            {strength.sessionCount} session{strength.sessionCount === 1 ? '' : 's'}
            {strength.missing.length > 0 && ` · missing: ${strength.missing.join(', ')}`}
          </div>
        </div>
      )}
      <div className="w-full" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
          <PolarGrid stroke="rgba(168,85,247,0.18)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10, fontFamily: 'Fragment Mono, monospace' }}
          />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          <Radar
            name="DNA"
            dataKey="value"
            stroke="#a855f7"
            fill="#a855f7"
            fillOpacity={0.3}
            strokeWidth={1.6}
          />
        </RadarChart>
      </ResponsiveContainer>
      </div>
    </GlassCard>
  )
}

function count(skills: string[] | undefined, needles: string[]): number {
  if (!skills) return 0
  return skills.filter((s) => needles.some((n) => s.toLowerCase().includes(n))).length
}
function clamp(n: number): number {
  return Math.max(0, Math.min(10, n))
}
