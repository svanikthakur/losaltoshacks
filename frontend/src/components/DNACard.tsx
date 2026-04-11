import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import BorderGlow from './BorderGlow'
import DNARadar from './DNARadar'

/**
 * Dashboard DNA card — pulls operator profile, renders the radar, links to
 * the dedicated /dna page when there's nothing yet.
 */
export default function DNACard() {
  const [dna, setDna] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getDNA()
      .then(setDna)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const empty = !dna || (dna.skills?.length || 0) === 0

  return (
    <BorderGlow
      backgroundColor="#0C0F15"
      borderRadius={12}
      glowRadius={36}
      glowColor="120 100 50"
      colors={['#00FF41', '#34D399', '#A7F3D0']}
      edgeSensitivity={20}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-charge)' }}>
            // YOUR DNA
          </div>
          <Link to="/dna" className="text-[10px] font-mono uppercase tracking-[0.15em] text-ink-dim hover:text-accent">
            edit ↗
          </Link>
        </div>

        {loading ? (
          <div className="text-xs text-muted font-mono">loading…</div>
        ) : empty ? (
          <div className="text-center py-8">
            <div className="text-sm text-ink-dim mb-4">No DNA profile yet. All agent recommendations are generic until you set one.</div>
            <Link to="/dna" className="btn">
              Build profile <span className="arrow">↗</span>
            </Link>
          </div>
        ) : (
          <>
            <DNARadar dna={dna} />
            <div className="mt-3 text-xs text-ink-dim grid grid-cols-2 gap-y-1">
              <span>
                <span className="text-muted">risk:</span> {dna.riskScore}/5
              </span>
              <span>
                <span className="text-muted">network:</span> {dna.networkSize || 0}
              </span>
              <span>
                <span className="text-muted">hours/wk:</span> {dna.hoursPerWeek || '—'}
              </span>
              <span>
                <span className="text-muted">priors:</span> {dna.priorStartups || 0}
              </span>
            </div>
          </>
        )}
      </div>
    </BorderGlow>
  )
}
