import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import BorderGlow from './BorderGlow'

/**
 * Community benchmarks — anonymous aggregate stats over all reports.
 * Shows where the current founder's score sits relative to everyone else.
 */
export default function BenchmarksCard({ myScore }: { myScore?: number }) {
  const [data, setData] = useState<{ avgScore: number; topDecile: number; sampleSize: number; synthetic?: boolean } | null>(null)

  useEffect(() => {
    api.getBenchmarks().then(setData).catch(() => {})
  }, [])

  if (!data) return null

  const myRank = myScore && data.avgScore ? (myScore >= data.topDecile ? 'top 10%' : myScore >= data.avgScore ? 'above average' : 'below average') : null

  return (
    <BorderGlow
      backgroundColor="#0C0F15"
      borderRadius={12}
      glowRadius={32}
      glowColor="120 100 50"
      colors={['#00FF41', '#34D399', '#A7F3D0']}
      edgeSensitivity={20}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-charge)' }}>
            // COMMUNITY
          </div>
          {data.synthetic && (
            <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted">simulated · {data.sampleSize} real</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <div className="font-display text-3xl font-bold tracking-tight">{data.avgScore}</div>
            <div className="text-xs text-muted font-mono uppercase tracking-wider mt-1">avg score</div>
          </div>
          <div>
            <div className="font-display text-3xl font-bold tracking-tight" style={{ color: 'var(--color-charge)' }}>
              {data.topDecile}
            </div>
            <div className="text-xs text-muted font-mono uppercase tracking-wider mt-1">top 10%</div>
          </div>
        </div>

        {myScore !== undefined && (
          <div className="border-t pt-4 mt-4" style={{ borderColor: 'rgba(0,255,65,0.15)' }}>
            <div className="text-xs text-ink-dim">
              You: <span className="font-mono" style={{ color: 'var(--color-charge)' }}>{myScore}/10</span>
              {myRank && <span className="ml-2 text-muted">({myRank})</span>}
            </div>
          </div>
        )}
      </div>
    </BorderGlow>
  )
}
