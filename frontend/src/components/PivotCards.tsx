import { useState } from 'react'
import { api } from '../lib/api'
import BorderGlow from './BorderGlow'

interface Pivot {
  rank: number
  pivotIdea: string
  newTargetMarket: string
  newCoreFeature: string
  estimatedScore: number
  whyLessCompetition: string
  marketSizeEst?: string
}

/**
 * Pivot Engine results — 5 cards. Each has an Adopt button that hands the
 * pivot back as a callback so the caller can re-run the pipeline on it.
 */
export default function PivotCards({
  reportId,
  onAdopt,
}: {
  reportId: string
  onAdopt?: (pivot: Pivot) => void
}) {
  const [pivots, setPivots] = useState<Pivot[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)

  const generate = async () => {
    setLoading(true)
    setErr(null)
    try {
      const r = await api.generatePivots(reportId)
      setPivots(r.pivots || [])
      setGenerated(true)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-charge)' }}>
            // PIVOT ENGINE
          </div>
          <h3 className="font-display text-2xl font-bold tracking-tight mt-1">5 Alternate Angles</h3>
          <p className="text-sm text-ink-dim mt-1">When the score is low, the engine proposes new directions.</p>
        </div>
        {!generated && (
          <button onClick={generate} className="btn" disabled={loading}>
            {loading ? 'Generating…' : 'Generate pivots ↗'}
          </button>
        )}
      </div>

      {err && <div className="font-mono text-xs text-warn">› {err}</div>}

      {generated && (
        <div className="grid md:grid-cols-2 gap-4">
          {pivots.map((p) => (
            <BorderGlow
              key={p.rank}
              backgroundColor="#0C0F15"
              borderRadius={10}
              glowRadius={32}
              glowColor="120 100 50"
              colors={['#00FF41', '#34D399', '#A7F3D0']}
              edgeSensitivity={20}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    pivot {String(p.rank).padStart(2, '0')}
                  </div>
                  <div
                    className="font-mono text-xs"
                    style={{
                      color: p.estimatedScore >= 7 ? '#00FF41' : p.estimatedScore >= 5 ? '#FBBF24' : '#FB7185',
                    }}
                  >
                    {p.estimatedScore}/10
                  </div>
                </div>
                <h4 className="font-display text-lg font-semibold leading-snug mb-3">{p.pivotIdea}</h4>
                <div className="space-y-2 text-xs text-ink-dim font-mono">
                  <div>
                    <span className="text-muted">› target:</span> {p.newTargetMarket}
                  </div>
                  <div>
                    <span className="text-muted">› feature:</span> {p.newCoreFeature}
                  </div>
                  {p.marketSizeEst && (
                    <div>
                      <span className="text-muted">› market:</span> {p.marketSizeEst}
                    </div>
                  )}
                </div>
                <p className="text-xs text-ink-dim italic mt-3">{p.whyLessCompetition}</p>
                {onAdopt && (
                  <button
                    onClick={() => onAdopt(p)}
                    className="mt-4 btn-ghost text-[10px] py-2 px-4 w-full justify-center"
                  >
                    Adopt this pivot ↗
                  </button>
                )}
              </div>
            </BorderGlow>
          ))}
        </div>
      )}
    </div>
  )
}
