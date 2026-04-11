import { useState } from 'react'
import { api } from '../lib/api'
import BorderGlow from './BorderGlow'

/**
 * Investor Stress Test modal — generates 5 brutal questions, collects answers,
 * submits for scoring, displays the final readiness score + per-question feedback.
 */
type Phase = 'idle' | 'loading-q' | 'answering' | 'scoring' | 'done' | 'error'

interface Question { q: string; rubric: string }
interface ScoredAnswer { a: string; score: number; feedback: string }

export default function StressTest({ reportId, onClose }: { reportId: string; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [result, setResult] = useState<{ answers: ScoredAnswer[]; finalScore: number; summary: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const start = async () => {
    setPhase('loading-q')
    setErr(null)
    try {
      const r = await api.simulatorStart(reportId)
      setQuestions(r.questions || [])
      setAnswers(new Array(r.questions?.length || 0).fill(''))
      setPhase('answering')
    } catch (e: any) {
      setErr(e.message)
      setPhase('error')
    }
  }

  const submit = async () => {
    setPhase('scoring')
    setErr(null)
    try {
      const r = await api.simulatorScore(reportId, questions, answers)
      setResult(r)
      setPhase('done')
    } catch (e: any) {
      setErr(e.message)
      setPhase('error')
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <BorderGlow
          backgroundColor="#0C0F15"
          borderRadius={12}
          glowRadius={48}
          glowColor="120 100 50"
          colors={['#00FF41', '#34D399', '#A7F3D0']}
          edgeSensitivity={20}
          animated
        >
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--color-charge)' }}>
                  // INVESTOR STRESS TEST
                </div>
                <h2 className="font-display text-3xl font-bold uppercase tracking-tight">5 Brutal Questions</h2>
              </div>
              <button onClick={onClose} className="text-ink-dim hover:text-ink text-2xl leading-none">
                ✕
              </button>
            </div>

            {phase === 'idle' && (
              <>
                <p className="text-ink-dim mb-8">
                  A skeptical Series A partner will ask 5 brutal questions about your pitch and score each answer 1–10.
                  Be specific. Generic answers get destroyed.
                </p>
                <button onClick={start} className="btn">
                  Begin <span className="arrow">↗</span>
                </button>
              </>
            )}

            {phase === 'loading-q' && (
              <div className="font-mono text-xs text-accent">› generating questions…</div>
            )}

            {phase === 'answering' && (
              <div className="space-y-6">
                {questions.map((q, i) => (
                  <div key={i}>
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</span>
                      <h3 className="font-display text-lg font-semibold">{q.q}</h3>
                    </div>
                    <div className="text-xs text-muted mb-3 font-mono">Rubric: {q.rubric}</div>
                    <textarea
                      value={answers[i] || ''}
                      onChange={(e) => {
                        const next = [...answers]
                        next[i] = e.target.value
                        setAnswers(next)
                      }}
                      rows={3}
                      placeholder="Your answer…"
                      className="field font-body"
                      style={{ background: '#07090d', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 14 }}
                    />
                  </div>
                ))}
                <button
                  onClick={submit}
                  disabled={answers.some((a) => !a.trim())}
                  className="btn disabled:opacity-40 mt-4"
                >
                  Submit for scoring <span className="arrow">↗</span>
                </button>
              </div>
            )}

            {phase === 'scoring' && (
              <div className="font-mono text-xs text-accent">› scoring answers… (this can take ~30s)</div>
            )}

            {phase === 'done' && result && (
              <div>
                <div className="text-center mb-8">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-2">READINESS SCORE</div>
                  <div
                    className="font-display font-black text-7xl tracking-tight"
                    style={{
                      color: result.finalScore >= 70 ? '#00FF41' : result.finalScore >= 50 ? '#FBBF24' : '#FB7185',
                    }}
                  >
                    {result.finalScore}
                  </div>
                  <div className="text-ink-dim mt-1">/ 100</div>
                </div>

                <div className="text-sm text-ink-dim leading-[1.6] mb-8 italic">"{result.summary}"</div>

                <div className="space-y-5">
                  {result.answers.map((a, i) => (
                    <div key={i} className="border-l-2 pl-4" style={{ borderColor: 'rgba(0,255,65,0.3)' }}>
                      <div className="flex items-baseline justify-between mb-1">
                        <div className="font-display text-sm font-semibold">Q{i + 1}</div>
                        <div className="font-mono text-xs text-accent">{a.score}/10</div>
                      </div>
                      <p className="text-xs text-ink-dim leading-[1.5]">{a.feedback}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {phase === 'error' && (
              <div className="font-mono text-xs text-warn">› {err}</div>
            )}
          </div>
        </BorderGlow>
      </div>
    </div>
  )
}
