import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import BorderGlow from '../components/BorderGlow'

interface Kit {
  domains: Array<{ name: string; tld: string; rationale: string }>
  logo: { concept: string; palette: string[]; fontDisplay: string; fontBody: string }
  landingHtml: string
  waitlistEmbed: string
  tagline: string
}

export default function LaunchKit() {
  const { reportId = '' } = useParams()
  const [kit, setKit] = useState<Kit | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    setErr(null)
    try {
      const r = await api.generateLaunchKit(reportId)
      setKit(r)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1200)
    })
  }

  const deployToVercel = () => {
    if (!kit) return
    const url = `https://vercel.com/new/clone?repository-url=https://github.com/agentconnect-demo/launchkit-template&project-name=${encodeURIComponent(kit.tagline.slice(0, 40))}`
    window.open(url, '_blank')
  }

  return (
    <main className="pt-32 pb-24 min-h-screen">
      <div className="shell">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--color-charge)' }}>
          // LAUNCH KIT
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold uppercase tracking-tight leading-[0.92]">
          One-click <span style={{ color: 'var(--color-charge)' }}>launch.</span>
        </h1>
        <p className="mt-5 text-ink-dim text-lg max-w-xl">
          Domains, logo concept, full landing page HTML, and a waitlist embed — generated in one shot.
        </p>

        {!kit && (
          <button onClick={generate} disabled={loading} className="btn mt-8">
            {loading ? 'Generating launch kit…' : 'Generate kit'} <span className="arrow">↗</span>
          </button>
        )}

        {err && <div className="mt-6 font-mono text-xs text-warn">› {err}</div>}

        {kit && (
          <div className="mt-12 grid lg:grid-cols-2 gap-6">
            {/* Tagline */}
            <BorderGlow backgroundColor="#0C0F15" borderRadius={10} glowRadius={28} glowColor="120 100 50" colors={['#00FF41', '#34D399', '#A7F3D0']} edgeSensitivity={20}>
              <div className="p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted mb-3">› tagline</div>
                <div className="font-display text-2xl font-bold tracking-tight">{kit.tagline}</div>
                <button onClick={() => copy(kit.tagline, 'tagline')} className="btn-ghost mt-4 text-[10px] py-2">
                  {copied === 'tagline' ? 'copied' : 'copy'}
                </button>
              </div>
            </BorderGlow>

            {/* Domains */}
            <BorderGlow backgroundColor="#0C0F15" borderRadius={10} glowRadius={28} glowColor="120 100 50" colors={['#00FF41', '#34D399', '#A7F3D0']} edgeSensitivity={20}>
              <div className="p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted mb-3">› domains</div>
                <ul className="space-y-2">
                  {kit.domains.map((d, i) => (
                    <li key={i} className="flex items-baseline justify-between font-mono text-sm">
                      <span style={{ color: 'var(--color-charge)' }}>{d.name}.{d.tld}</span>
                      <span className="text-[10px] text-muted">{d.rationale.slice(0, 30)}…</span>
                    </li>
                  ))}
                </ul>
              </div>
            </BorderGlow>

            {/* Logo concept */}
            <BorderGlow backgroundColor="#0C0F15" borderRadius={10} glowRadius={28} glowColor="120 100 50" colors={['#00FF41', '#34D399', '#A7F3D0']} edgeSensitivity={20}>
              <div className="p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted mb-3">› logo concept</div>
                <p className="text-ink-dim text-sm mb-4 italic">"{kit.logo.concept}"</p>
                <div className="flex gap-2 mb-3">
                  {kit.logo.palette.map((c) => (
                    <div key={c} className="w-10 h-10" style={{ background: c, border: '1px solid rgba(255,255,255,0.2)' }} title={c} />
                  ))}
                </div>
                <div className="text-xs font-mono text-ink-dim">
                  Display: <span style={{ color: 'var(--color-charge)' }}>{kit.logo.fontDisplay}</span>
                  <br />
                  Body: <span style={{ color: 'var(--color-charge)' }}>{kit.logo.fontBody}</span>
                </div>
              </div>
            </BorderGlow>

            {/* Waitlist */}
            <BorderGlow backgroundColor="#0C0F15" borderRadius={10} glowRadius={28} glowColor="120 100 50" colors={['#00FF41', '#34D399', '#A7F3D0']} edgeSensitivity={20}>
              <div className="p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted mb-3">› waitlist embed</div>
                <pre className="text-[10px] font-mono bg-black/40 p-3 max-h-32 overflow-auto" style={{ color: '#34D399' }}>
                  {kit.waitlistEmbed.slice(0, 400)}
                </pre>
                <button onClick={() => copy(kit.waitlistEmbed, 'waitlist')} className="btn-ghost mt-3 text-[10px] py-2">
                  {copied === 'waitlist' ? 'copied' : 'copy snippet'}
                </button>
              </div>
            </BorderGlow>

            {/* Landing iframe preview */}
            <div className="lg:col-span-2">
              <BorderGlow backgroundColor="#0C0F15" borderRadius={10} glowRadius={32} glowColor="120 100 50" colors={['#00FF41', '#34D399', '#A7F3D0']} edgeSensitivity={20}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">› landing page preview</div>
                    <div className="flex gap-2">
                      <button onClick={() => copy(kit.landingHtml, 'html')} className="btn-ghost text-[10px] py-2">
                        {copied === 'html' ? 'copied' : 'copy html'}
                      </button>
                      <button onClick={deployToVercel} className="btn text-[10px] py-2">
                        Deploy to Vercel ↗
                      </button>
                    </div>
                  </div>
                  <iframe
                    title="landing preview"
                    srcDoc={kit.landingHtml}
                    sandbox="allow-scripts"
                    className="w-full h-[480px] border"
                    style={{ borderColor: 'rgba(0,255,65,0.2)', background: '#000' }}
                  />
                </div>
              </BorderGlow>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
