import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import BorderGlow from '../components/BorderGlow'

interface Match {
  id: string
  name: string
  location?: string
  skills: string[]
  industryFocus?: string
  score: number
  reason: string
}

export default function Network() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    api
      .getMatches()
      .then((r) => setMatches(r.matches || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="pt-32 pb-24 min-h-screen">
      <div className="shell">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--color-charge)' }}>
          // NETWORK
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold uppercase tracking-tight leading-[0.92]">
          Co-founder <span style={{ color: 'var(--color-charge)' }}>matches.</span>
        </h1>
        <p className="mt-5 text-ink-dim text-lg max-w-xl">
          Cosine-similarity match against complementary skill vectors. Same industry, opposite role, similar risk
          profile. Top 5.
        </p>

        {loading && <div className="mt-12 font-mono text-xs text-muted">› loading matches…</div>}
        {err && <div className="mt-12 font-mono text-xs text-warn">› {err}</div>}

        {!loading && matches.length === 0 && (
          <div className="mt-12 font-mono text-xs text-ink-dim">
            › no matches yet — invite a few founders so the network has signal.
          </div>
        )}

        <div className="mt-12 grid md:grid-cols-2 gap-5">
          {matches.map((m) => (
            <BorderGlow
              key={m.id}
              backgroundColor="#0C0F15"
              borderRadius={12}
              glowRadius={32}
              glowColor="120 100 50"
              colors={['#00FF41', '#34D399', '#A7F3D0']}
              edgeSensitivity={20}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display text-2xl font-bold tracking-tight">{m.name}</h3>
                    {m.location && <div className="text-xs text-muted mt-1 font-mono">{m.location}</div>}
                  </div>
                  <div
                    className="font-mono text-xs"
                    style={{
                      color: m.score > 0.7 ? '#00FF41' : m.score > 0.4 ? '#FBBF24' : '#FB7185',
                    }}
                  >
                    {Math.round(m.score * 100)}%
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {m.skills.slice(0, 6).map((s) => (
                    <span
                      key={s}
                      className="font-mono text-[9px] uppercase tracking-[0.12em] px-2 py-0.5 text-ink-dim"
                      style={{ background: 'rgba(0,255,65,0.06)', border: '1px solid rgba(0,255,65,0.18)' }}
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-ink-dim italic mb-5">{m.reason}</p>

                <button className="btn w-full justify-center text-[10px] py-2.5">
                  Connect <span className="arrow">↗</span>
                </button>
              </div>
            </BorderGlow>
          ))}
        </div>
      </div>
    </main>
  )
}
