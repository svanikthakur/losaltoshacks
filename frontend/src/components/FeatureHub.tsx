/**
 * FeatureHub — grid of AI-powered tools shown at the bottom of every report.
 * Each card triggers a real backend endpoint and renders the result inline.
 */
import { useRef, useState } from 'react'
import { api } from '../lib/api'

const SpeechRecognition = typeof window !== 'undefined'
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null

function useVoiceInput() {
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recRef = useRef<any>(null)

  const supported = !!SpeechRecognition

  const start = () => {
    if (!SpeechRecognition) return
    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    let final = ''
    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      setTranscript((final + interim).trim())
    }
    rec.onerror = () => setRecording(false)
    rec.onend = () => setRecording(false)
    recRef.current = rec
    rec.start()
    setRecording(true)
  }

  const stop = () => {
    recRef.current?.stop()
    setRecording(false)
  }

  return { recording, transcript, supported, start, stop, setTranscript }
}

interface Props {
  reportId: string
  competitors?: Array<{ name: string }>
}

type ToolState = 'idle' | 'loading' | 'done' | 'error'

export default function FeatureHub({ reportId, competitors }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div
            className="font-mono text-[10px] uppercase tracking-[0.2em] mb-2"
            style={{ color: 'var(--color-charge)' }}
          >
            // AI TOOLS
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-[-0.02em]">
            Feature hub
          </h2>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ABHeadlines reportId={reportId} />
        <RevenueModels reportId={reportId} />
        <SprintPlan reportId={reportId} />
        <DueDiligence reportId={reportId} />
        <CompetitorDive reportId={reportId} competitors={competitors} />
        <CoFounderSim reportId={reportId} />
        <MarketPulse reportId={reportId} />
        <CohortBenchmark reportId={reportId} />
        <VoicePitchCoach reportId={reportId} />
        <WarmIntroMapper reportId={reportId} />
        <VercelDeploy reportId={reportId} />
      </div>
    </div>
  )
}

function Card({
  label,
  desc,
  accent,
  state,
  onRun,
  children,
}: {
  label: string
  desc: string
  accent?: string
  state: ToolState
  onRun: () => void
  children?: React.ReactNode
}) {
  const ac = accent || 'var(--color-charge)'
  return (
    <div
      className="rounded-xl border p-5 flex flex-col"
      style={{
        borderColor: state === 'done' ? `${ac}44` : 'var(--color-border-1)',
        background: state === 'done' ? `${ac}08` : 'var(--color-surface-1)',
      }}
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] mb-1" style={{ color: ac }}>
        {label}
      </div>
      <div className="text-sm text-ink-dim mb-4 flex-1">{desc}</div>

      {state === 'idle' && (
        <button
          onClick={onRun}
          className="w-full font-mono text-[10px] uppercase tracking-[0.15em] py-2 rounded transition"
          style={{ background: ac, color: 'var(--color-void)', border: `1px solid ${ac}` }}
        >
          Run →
        </button>
      )}
      {state === 'loading' && (
        <div className="w-full text-center font-mono text-[10px] uppercase tracking-[0.15em] py-2 animate-pulse" style={{ color: ac }}>
          generating…
        </div>
      )}
      {state === 'error' && (
        <button
          onClick={onRun}
          className="w-full font-mono text-[10px] uppercase tracking-[0.15em] py-2 rounded"
          style={{ color: '#FB7185', border: '1px solid rgba(251,113,133,0.4)' }}
        >
          retry →
        </button>
      )}
      {state === 'done' && children && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  )
}

function ComingSoon({ label, desc }: { label: string; desc: string }) {
  return (
    <div
      className="rounded-xl border p-5 opacity-50"
      style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-1)' }}
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] mb-1 text-muted">{label}</div>
      <div className="text-sm text-ink-dim mb-4">{desc}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted text-center py-2">
        coming soon
      </div>
    </div>
  )
}

/* ─── A/B Headlines ─── */
function ABHeadlines({ reportId }: { reportId: string }) {
  const [state, setState] = useState<ToolState>('idle')
  const [data, setData] = useState<any>(null)
  const run = async () => {
    setState('loading')
    try {
      const r = await api.abHeadlines(reportId)
      setData(r)
      setState('done')
    } catch { setState('error') }
  }
  return (
    <Card label="A/B Headline Tester" desc="5 one-liner variations scored on clarity, appeal & memorability" state={state} onRun={run} accent="#22D3EE">
      {data?.headlines?.map((h: any, i: number) => (
        <div key={i} className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-ink flex-1 line-clamp-2">"{h.text}"</span>
          <span className="font-mono text-accent flex-shrink-0">{h.totalScore}</span>
        </div>
      ))}
    </Card>
  )
}

/* ─── Revenue Models ─── */
function RevenueModels({ reportId }: { reportId: string }) {
  const [state, setState] = useState<ToolState>('idle')
  const [data, setData] = useState<any>(null)
  const run = async () => {
    setState('loading')
    try {
      const r = await api.revenueModels(reportId)
      setData(r)
      setState('done')
    } catch { setState('error') }
  }
  return (
    <Card label="Revenue Model Generator" desc="5 monetization strategies with MRR projections" state={state} onRun={run} accent="#A855F7">
      {data?.models?.map((m: any, i: number) => (
        <div key={i} className="text-xs border-b border-white/5 pb-2">
          <div className="flex justify-between">
            <span className="font-mono uppercase text-accent text-[10px]">{m.type}</span>
            <span className="text-muted">{m.projectedMrr?.at1000}/mo @1k users</span>
          </div>
          <div className="text-ink-dim mt-1 line-clamp-2">{m.description}</div>
        </div>
      ))}
    </Card>
  )
}

/* ─── Sprint Plan ─── */
function SprintPlan({ reportId }: { reportId: string }) {
  const [state, setState] = useState<ToolState>('idle')
  const [data, setData] = useState<any>(null)
  const run = async () => {
    setState('loading')
    try {
      const r = await api.sprintPlan(reportId)
      setData(r)
      setState('done')
    } catch { setState('error') }
  }
  return (
    <Card label="30-Day Sprint Planner" desc="Week-by-week execution plan with tasks & guides" state={state} onRun={run} accent="#F59E0B">
      {data?.weeks?.map((w: any) => (
        <div key={w.week} className="text-xs">
          <div className="font-mono text-accent text-[10px]">Week {w.week}: {w.theme}</div>
          <ul className="text-ink-dim mt-1 space-y-0.5">
            {w.tasks?.slice(0, 3).map((t: any, j: number) => (
              <li key={j} className="flex gap-1">
                <span className="text-muted">›</span> {t.task} <span className="text-muted ml-auto">{t.timeEstimate}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  )
}

/* ─── Due Diligence ─── */
function DueDiligence({ reportId }: { reportId: string }) {
  const [state, setState] = useState<ToolState>('idle')
  const [data, setData] = useState<any>(null)
  const run = async () => {
    setState('loading')
    try {
      const r = await api.dueDiligence(reportId)
      setData(r)
      setState('done')
    } catch { setState('error') }
  }
  return (
    <Card label="Due Diligence Checklist" desc="Investor-ready checklist for your stage & industry" state={state} onRun={run} accent="#10B981">
      {data?.items && (
        <div className="text-xs text-ink-dim">
          {data.items.length} items across{' '}
          {[...new Set(data.items.map((i: any) => i.category))].length} categories
          <div className="mt-2 space-y-1">
            {data.items.slice(0, 5).map((item: any, i: number) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-muted font-mono text-[9px] uppercase w-14 flex-shrink-0">{item.category}</span>
                <span className="flex-1">{item.item}</span>
              </div>
            ))}
            {data.items.length > 5 && <div className="text-muted">+{data.items.length - 5} more…</div>}
          </div>
        </div>
      )}
    </Card>
  )
}

/* ─── Competitor Deep Dive ─── */
function CompetitorDive({ reportId, competitors }: { reportId: string; competitors?: Array<{ name: string }> }) {
  const [state, setState] = useState<ToolState>('idle')
  const [data, setData] = useState<any>(null)
  const [target, setTarget] = useState(competitors?.[0]?.name || '')
  const run = async () => {
    if (!target) return
    setState('loading')
    try {
      const r = await api.competitorDeepDive(reportId, target)
      setData(r)
      setState('done')
    } catch { setState('error') }
  }
  return (
    <Card label="Competitor Deep Dive" desc="Full teardown: pricing, weaknesses, positioning" state={state} onRun={run} accent="#EF4444">
      {state === 'idle' && competitors && competitors.length > 0 && (
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full text-xs rounded px-2 py-1.5 mb-2 font-mono"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-1)', border: '1px solid var(--color-border-1)' }}
        >
          {competitors.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      )}
      {data && (
        <div className="text-xs space-y-2">
          <div><span className="text-muted">pricing:</span> <span className="text-ink-dim">{data.pricing}</span></div>
          {data.weaknesses?.slice(0, 3).map((w: string, i: number) => (
            <div key={i} className="text-ink-dim">− {w}</div>
          ))}
          <div className="text-accent italic">{data.positioningAdvice}</div>
        </div>
      )}
    </Card>
  )
}

/* ─── Co-Founder Sim (voice-enabled) ─── */
function CoFounderSim({ reportId }: { reportId: string }) {
  const [state, setState] = useState<ToolState>('idle')
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)
  const [phase, setPhase] = useState<'start' | 'answer' | 'scored'>('start')
  const [activeVoice, setActiveVoice] = useState<number | null>(null)

  const startSim = async () => {
    setState('loading')
    try {
      const r = await api.cofounderSimStart(reportId, 'technical')
      setQuestions(r.questions || [])
      setAnswers(new Array(r.questions?.length || 5).fill(''))
      setPhase('answer')
      setState('done')
    } catch { setState('error') }
  }

  const scoreSim = async () => {
    setState('loading')
    try {
      const r = await api.cofounderSimScore(reportId, questions, answers)
      setResult(r)
      setPhase('scored')
      setState('done')
    } catch { setState('error') }
  }

  return (
    <Card label="Co-Founder Pitch Sim" desc="Roleplay with voice or text — AI scores your answers" state={phase === 'start' ? state : 'done'} onRun={startSim} accent="#F472B6">
      {phase === 'answer' && (
        <div className="space-y-3">
          {questions.map((q: any, i: number) => (
            <VoiceAnswerField
              key={i}
              question={q.q}
              value={answers[i]}
              onChange={(v) => {
                const next = [...answers]
                next[i] = v
                setAnswers(next)
              }}
              isActiveVoice={activeVoice === i}
              onVoiceStart={() => setActiveVoice(i)}
              onVoiceStop={() => setActiveVoice(null)}
            />
          ))}
          <button
            onClick={scoreSim}
            disabled={answers.every((a) => !a.trim())}
            className="w-full font-mono text-[10px] uppercase tracking-[0.15em] py-2.5 rounded transition disabled:opacity-30"
            style={{ background: '#F472B6', color: 'var(--color-void)' }}
          >
            Score my answers →
          </button>
        </div>
      )}
      {phase === 'scored' && result && (
        <div className="text-xs space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-muted">Overall score</span>
            <span className="font-display text-2xl font-bold" style={{ color: result.overallScore >= 60 ? '#00FF41' : result.overallScore >= 30 ? '#FBBF24' : '#FB7185' }}>
              {result.overallScore}/100
            </span>
          </div>
          <div className="text-ink-dim italic">{result.verdict}</div>
        </div>
      )}
    </Card>
  )
}

function VoiceAnswerField({
  question,
  value,
  onChange,
  isActiveVoice,
  onVoiceStart,
  onVoiceStop,
}: {
  question: string
  value: string
  onChange: (v: string) => void
  isActiveVoice: boolean
  onVoiceStart: () => void
  onVoiceStop: () => void
}) {
  const voice = useVoiceInput()

  const toggleVoice = () => {
    if (voice.recording) {
      voice.stop()
      onVoiceStop()
      if (voice.transcript) onChange(voice.transcript)
    } else {
      voice.setTranscript(value)
      voice.start()
      onVoiceStart()
    }
  }

  // Sync live transcript into the field while recording
  const displayValue = voice.recording ? voice.transcript : value

  return (
    <div>
      <div className="text-xs text-ink mb-1.5 font-medium leading-snug">{question}</div>
      <div className="relative">
        <textarea
          className="w-full text-xs rounded px-2 py-1.5 pr-10 resize-none"
          style={{
            background: voice.recording ? 'rgba(244,114,182,0.08)' : 'var(--color-surface-2)',
            color: 'var(--color-text-1)',
            border: voice.recording ? '1px solid #F472B6' : '1px solid var(--color-border-1)',
          }}
          rows={3}
          value={displayValue}
          onChange={(e) => {
            onChange(e.target.value)
            voice.setTranscript(e.target.value)
          }}
          placeholder="Type or click mic to speak..."
        />
        {voice.supported && (
          <button
            onClick={toggleVoice}
            className="absolute right-2 top-2 w-6 h-6 rounded-full flex items-center justify-center transition"
            style={{
              background: voice.recording ? '#F472B6' : 'var(--color-surface-3)',
              color: voice.recording ? 'white' : 'var(--color-text-2)',
            }}
            title={voice.recording ? 'Stop recording' : 'Start voice input'}
          >
            {voice.recording ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
            )}
          </button>
        )}
      </div>
      {voice.recording && (
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-[#F472B6] animate-pulse" />
          <span className="font-mono text-[9px] uppercase tracking-[0.15em]" style={{ color: '#F472B6' }}>
            listening…
          </span>
        </div>
      )}
    </div>
  )
}

/* ─── Market Pulse ─── */
function MarketPulse({ reportId }: { reportId: string }) {
  const [state, setState] = useState<ToolState>('idle')
  const [data, setData] = useState<any>(null)
  const run = async () => {
    setState('loading')
    try {
      const r = await api.marketPulse(reportId)
      setData(r)
      setState('done')
    } catch { setState('error') }
  }
  return (
    <Card label="Live Market Pulse" desc="Detect new competitors, funding rounds & market shifts" state={state} onRun={run} accent="#6366F1">
      {data && (
        <div className="text-xs space-y-2">
          {data.alerts?.length === 0 && <div className="text-muted">No new alerts — market is stable.</div>}
          {data.alerts?.map((a: any, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <span
                className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: a.impact === 'negative' ? 'rgba(251,113,133,0.12)' : a.impact === 'positive' ? 'rgba(0,255,65,0.12)' : 'rgba(255,255,255,0.06)',
                  color: a.impact === 'negative' ? '#FB7185' : a.impact === 'positive' ? '#00FF41' : '#B3ADA2',
                }}
              >
                {a.type}
              </span>
              <span className="text-ink-dim">{a.detail}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ─── Cohort Benchmark ─── */
function CohortBenchmark({ reportId }: { reportId: string }) {
  const [state, setState] = useState<ToolState>('idle')
  const [data, setData] = useState<any>(null)
  const run = async () => {
    setState('loading')
    try {
      const r = await api.cohortBenchmarks(reportId)
      setData(r)
      setState('done')
    } catch { setState('error') }
  }
  return (
    <Card label="Cohort Benchmarking" desc="See where you rank against other AgentConnect founders" state={state} onRun={run} accent="#14B8A6">
      {data && (
        <div className="text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-muted">Percentile</span>
            <span className="font-display text-xl font-bold" style={{ color: 'var(--color-charge)' }}>
              Top {100 - (data.percentile || 0)}%
            </span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Cohort avg</span>
            <span>{data.avgScore}/10</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Top decile</span>
            <span>{data.topDecileScore}/10</span>
          </div>
          {data.insight && <div className="text-ink-dim italic mt-2">{data.insight}</div>}
        </div>
      )}
    </Card>
  )
}

/* ─── Voice Pitch Coach ─── */
function VoicePitchCoach({ reportId }: { reportId: string }) {
  const voice = useVoiceInput()
  const [state, setState] = useState<ToolState>('idle')
  const [result, setResult] = useState<any>(null)
  const [phase, setPhase] = useState<'idle' | 'recording' | 'review' | 'scored'>('idle')
  const [seconds, setSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = () => {
    voice.setTranscript('')
    voice.start()
    setPhase('recording')
    setSeconds(0)
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s >= 59) {
          stopRecording()
          return 60
        }
        return s + 1
      })
    }, 1000)
  }

  const stopRecording = () => {
    voice.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setPhase('review')
  }

  const scorePitch = async () => {
    if (!voice.transcript.trim()) return
    setState('loading')
    setPhase('scored')
    try {
      const res = await fetch('/api/features/voice-coach', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${localStorage.getItem('ac_token')}`,
        },
        body: JSON.stringify({ reportId, transcript: voice.transcript }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
      } else {
        setResult({ clarityScore: 0, confidenceScore: 0, structureScore: 0, overallScore: 0, feedback: 'Scoring service unavailable.', lineByLine: [] })
      }
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (!voice.supported) {
    return <ComingSoon label="Voice Pitch Coach" desc="Your browser doesn't support speech recognition. Try Chrome or Edge." />
  }

  return (
    <div
      className="rounded-xl border p-5 flex flex-col"
      style={{
        borderColor: phase === 'recording' ? '#EF4444' : 'var(--color-border-1)',
        background: phase === 'recording' ? 'rgba(239,68,68,0.06)' : 'var(--color-surface-1)',
      }}
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] mb-1" style={{ color: '#EF4444' }}>
        Voice pitch coach
      </div>
      <div className="text-sm text-ink-dim mb-4">Record your 60s pitch — AI scores clarity, confidence & structure</div>

      {phase === 'idle' && (
        <button
          onClick={startRecording}
          className="w-full font-mono text-[10px] uppercase tracking-[0.15em] py-2.5 rounded flex items-center justify-center gap-2"
          style={{ background: '#EF4444', color: 'white' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
          Start recording →
        </button>
      )}

      {phase === 'recording' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#EF4444] animate-pulse" />
              <span className="font-mono text-sm" style={{ color: '#EF4444' }}>
                {seconds}s / 60s
              </span>
            </div>
            <div className="h-1.5 flex-1 mx-4 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(seconds / 60) * 100}%`, background: '#EF4444' }}
              />
            </div>
          </div>
          <div className="text-xs text-ink-dim min-h-[60px] italic">
            {voice.transcript || 'Speak now...'}
          </div>
          <button
            onClick={stopRecording}
            className="w-full font-mono text-[10px] uppercase tracking-[0.15em] py-2 rounded"
            style={{ border: '1px solid #EF4444', color: '#EF4444' }}
          >
            Stop recording
          </button>
        </div>
      )}

      {phase === 'review' && (
        <div className="space-y-3">
          <div className="text-xs text-ink-dim italic min-h-[40px]">
            "{voice.transcript || '(no speech detected)'}"
          </div>
          <div className="flex gap-2">
            <button
              onClick={startRecording}
              className="flex-1 font-mono text-[10px] uppercase tracking-[0.15em] py-2 rounded"
              style={{ border: '1px solid var(--color-border-1)', color: 'var(--color-text-2)' }}
            >
              Re-record
            </button>
            <button
              onClick={scorePitch}
              disabled={!voice.transcript.trim()}
              className="flex-1 font-mono text-[10px] uppercase tracking-[0.15em] py-2 rounded disabled:opacity-30"
              style={{ background: '#EF4444', color: 'white' }}
            >
              Score my pitch →
            </button>
          </div>
        </div>
      )}

      {phase === 'scored' && state === 'loading' && (
        <div className="text-center font-mono text-[10px] uppercase tracking-[0.15em] py-4 animate-pulse" style={{ color: '#EF4444' }}>
          analyzing your pitch…
        </div>
      )}

      {phase === 'scored' && result && (
        <div className="text-xs space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Clarity', score: result.clarityScore },
              { label: 'Confidence', score: result.confidenceScore },
              { label: 'Structure', score: result.structureScore },
            ].map((d) => (
              <div key={d.label} className="text-center">
                <div className="font-mono text-[9px] text-muted uppercase">{d.label}</div>
                <div className="font-display text-lg font-bold" style={{ color: d.score >= 7 ? '#00FF41' : d.score >= 5 ? '#FBBF24' : '#FB7185' }}>
                  {d.score}/10
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <div className="font-mono text-[9px] text-muted uppercase">Overall</div>
            <div className="font-display text-2xl font-bold" style={{ color: result.overallScore >= 7 ? '#00FF41' : result.overallScore >= 5 ? '#FBBF24' : '#FB7185' }}>
              {result.overallScore}/10
            </div>
          </div>
          {result.feedback && <div className="text-ink-dim italic">{result.feedback}</div>}
          {result.lineByLine?.length > 0 && (
            <div className="space-y-1 mt-2">
              {result.lineByLine.map((l: any, i: number) => (
                <div key={i} className="text-ink-dim">
                  <span className="text-accent">›</span> {l}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => { setPhase('idle'); setResult(null); setState('idle') }}
            className="w-full font-mono text-[10px] uppercase tracking-[0.15em] py-2 rounded mt-2"
            style={{ border: '1px solid var(--color-border-1)', color: 'var(--color-text-2)' }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Vercel Deploy ─── */
function VercelDeploy({ reportId }: { reportId: string }) {
  const [state, setState] = useState<ToolState>('idle')
  const [url, setUrl] = useState<string | null>(null)
  const run = async () => {
    setState('loading')
    try {
      const r = await api.deployVercel(reportId)
      setUrl(r.url)
      setState('done')
    } catch { setState('error') }
  }
  return (
    <Card label="One-Click Deploy" desc="Deploy a live landing page to Vercel in seconds" state={state} onRun={run} accent="#00D4FF">
      {url && (
        <div className="space-y-2">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block w-full text-center font-mono text-[10px] uppercase tracking-[0.15em] py-2 rounded"
            style={{ background: '#00D4FF', color: 'var(--color-void)' }}
          >
            Open live site ↗
          </a>
          <div className="font-mono text-[10px] text-ink-dim break-all">{url}</div>
        </div>
      )}
    </Card>
  )
}

/* ─── Warm Intro Mapper ─── */
function WarmIntroMapper({ reportId }: { reportId: string }) {
  const [state, setState] = useState<ToolState>('idle')
  const [data, setData] = useState<any>(null)
  const run = async () => {
    setState('loading')
    try {
      const r = await api.warmIntroMapper(reportId)
      setData(r)
      setState('done')
    } catch { setState('error') }
  }

  const strengthColor = (s: string) =>
    s === 'strong' ? '#10B981' : s === 'medium' ? '#F59E0B' : '#EF4444'

  return (
    <Card label="Warm Intro Mapper" desc="Map plausible warm intro paths to your target VCs" state={state} onRun={run} accent="#8B5CF6">
      {data?.paths?.map((p: any, i: number) => (
        <div key={i} className="text-xs border-b border-white/5 pb-3 last:border-0">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="font-mono uppercase text-[10px]" style={{ color: '#8B5CF6' }}>
              {p.firm}
            </span>
            <span
              className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-full"
              style={{
                background: `${strengthColor(p.strength)}18`,
                color: strengthColor(p.strength),
              }}
            >
              {p.strength}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-ink mb-1.5">
            {p.path?.map((node: string, j: number) => (
              <span key={j} className="flex items-center gap-1">
                {j > 0 && <span className="text-muted mx-0.5">&rarr;</span>}
                <span
                  className="px-1.5 py-0.5 rounded"
                  style={{
                    background: j === 0 ? 'rgba(139,92,246,0.12)' : j === p.path.length - 1 ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                    color: j === 0 ? '#8B5CF6' : j === p.path.length - 1 ? '#10B981' : 'inherit',
                  }}
                >
                  {node}
                </span>
              </span>
            ))}
          </div>
          <div className="text-muted text-[10px] mb-1">via {p.connectionType}</div>
          <div className="text-ink-dim italic">{p.advice}</div>
        </div>
      ))}
    </Card>
  )
}

/* ─── Download Reports ─── */
function DownloadReports({ reportId }: { reportId: string }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ac_token') : ''
  return (
    <div
      className="rounded-xl border p-5 flex flex-col"
      style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-1)' }}
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--color-charge)' }}>
        Download reports
      </div>
      <div className="text-sm text-ink-dim mb-4 flex-1">Professional PDFs with graphs & data</div>
      <div className="space-y-2">
        <a
          href={`/api/export/validation-report/${reportId}?token=${token}`}
          target="_blank"
          rel="noreferrer"
          className="block w-full text-center font-mono text-[10px] uppercase tracking-[0.15em] py-2 rounded"
          style={{ background: 'var(--color-charge)', color: 'var(--color-void)', border: '1px solid var(--color-charge)' }}
        >
          Validation Report .pdf ↓
        </a>
        <a
          href={`/api/export/market-research/${reportId}?token=${token}`}
          target="_blank"
          rel="noreferrer"
          className="block w-full text-center font-mono text-[10px] uppercase tracking-[0.15em] py-2 rounded"
          style={{ color: 'var(--color-charge)', border: '1px solid var(--color-charge)' }}
        >
          Market Research .pdf ↓
        </a>
      </div>
    </div>
  )
}
