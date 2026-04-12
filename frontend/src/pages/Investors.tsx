import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import BorderGlow from '../components/BorderGlow'

interface TrackingEntry {
  id: string
  vcMatchId: string
  trackingToken: string
  openedAt?: number
  clickedAt?: number
  timeOnDeckSeconds?: number
}

export default function Investors() {
  const { reportId = '' } = useParams()
  const [tracking, setTracking] = useState<TrackingEntry[]>([])
  const [report, setReport] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getReport(reportId), api.getInvestorTracking(reportId)])
      .then(([r, t]) => {
        setReport(r)
        setTracking(t.tracking || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [reportId])

  const investors = (report?.connect_output?.investors as any[]) || []

  return (
    <main className="pt-32 pb-24 min-h-screen">
      <div className="shell">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--color-charge)' }}>
          // INVESTOR INTEL
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold uppercase tracking-tight leading-[0.92]">
          Live VC <span style={{ color: 'var(--color-charge)' }}>tracking.</span>
        </h1>
        <p className="mt-5 text-ink-dim text-lg max-w-xl">
          Every email sent through Venture AI drops a tracking pixel. Opens, clicks, and time-on-deck stream into
          this dashboard in real time.
        </p>

        {loading && <div className="mt-12 font-mono text-xs text-muted">› loading…</div>}

        <div className="mt-12 space-y-4">
          {investors.map((inv: any, i: number) => {
            const t = tracking[i]
            return (
              <BorderGlow
                key={inv.name + i}
                backgroundColor="#0C0F15"
                borderRadius={10}
                glowRadius={28}
                glowColor="120 100 50"
                colors={['#00FF41', '#34D399', '#A7F3D0']}
                edgeSensitivity={20}
              >
                <div className="p-5 grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-12 md:col-span-4">
                    <div className="font-display text-xl font-semibold">{inv.name}</div>
                    <div className="font-mono text-xs text-muted mt-1">{inv.thesis}</div>
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted mb-1">
                      thesis fit
                    </div>
                    <div className="font-mono text-sm" style={{ color: 'var(--color-charge)' }}>
                      {Math.round((inv.fit || 0) * 100)}%
                    </div>
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted mb-1">activity</div>
                    {t?.openedAt ? (
                      <div className="font-mono text-xs text-accent">
                        opened {timeAgo(t.openedAt)}
                        {t.clickedAt && <span> · clicked deck</span>}
                        {t.timeOnDeckSeconds ? <span> · {t.timeOnDeckSeconds}s on deck</span> : null}
                      </div>
                    ) : (
                      <div className="font-mono text-xs text-ink-dim">unsent / unopened</div>
                    )}
                  </div>
                  <div className="col-span-12 md:col-span-2 text-right">
                    <button className="btn-ghost text-[10px] py-2 px-4">Send →</button>
                  </div>
                </div>
              </BorderGlow>
            )
          })}
        </div>
      </div>
    </main>
  )
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
