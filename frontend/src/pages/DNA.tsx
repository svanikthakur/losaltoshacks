import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import DNARadar from '../components/DNARadar'
import BorderGlow from '../components/BorderGlow'

const SKILL_OPTIONS = [
  'engineering', 'frontend', 'backend', 'ml/ai', 'design',
  'product', 'sales', 'marketing', 'growth', 'finance',
  'ops', 'legal', 'community', 'content', 'data',
]

export default function DNA() {
  const nav = useNavigate()
  const [dna, setDna] = useState({
    skills: [] as string[],
    riskScore: 3,
    location: '',
    networkSize: 0,
    hoursPerWeek: 10,
    priorStartups: 0,
    industryFocus: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getDNA().then((d) => setDna({ ...dna, ...d })).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleSkill = (s: string) => {
    setDna((d) => ({
      ...d,
      skills: d.skills.includes(s) ? d.skills.filter((x) => x !== s) : [...d.skills, s],
    }))
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.putDNA(dna)
      nav('/dashboard')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="pt-32 pb-24 min-h-screen">
      <div className="shell max-w-4xl mx-auto">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--color-charge)' }}>
          // OPERATOR DNA
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold uppercase tracking-tight leading-[0.92]">
          Build your <span style={{ color: 'var(--color-charge)' }}>profile.</span>
        </h1>
        <p className="mt-5 text-ink-dim text-lg max-w-xl">
          Every agent reads this profile and personalizes its output to your strengths, time budget, and network.
          Skipping this leaves the agents flying blind.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mt-12">
          <BorderGlow
            backgroundColor="#0C0F15"
            borderRadius={12}
            glowRadius={32}
            glowColor="120 100 50"
            colors={['#00FF41', '#34D399', '#A7F3D0']}
            edgeSensitivity={20}
          >
            <div className="p-7 space-y-7">
              {/* Skills */}
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted mb-3">
                  ›  skills
                </div>
                <div className="flex flex-wrap gap-2">
                  {SKILL_OPTIONS.map((s) => {
                    const active = dna.skills.includes(s)
                    return (
                      <button
                        key={s}
                        onClick={() => toggleSkill(s)}
                        className="font-mono text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 transition-all"
                        style={{
                          background: active ? 'var(--color-charge)' : 'transparent',
                          color: active ? 'var(--color-void)' : 'var(--color-text-2)',
                          border: '1px solid',
                          borderColor: active ? 'var(--color-charge)' : 'rgba(0,255,65,0.18)',
                        }}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Risk */}
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted mb-3">
                  ›  risk tolerance: {dna.riskScore}/5
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={dna.riskScore}
                  onChange={(e) => setDna({ ...dna, riskScore: Number(e.target.value) })}
                  className="w-full accent-[#00FF41]"
                />
              </div>

              {/* Location */}
              <Field label="location" value={dna.location} onChange={(v) => setDna({ ...dna, location: v })} placeholder="San Francisco, CA" />

              {/* Network */}
              <Field
                label="network size"
                type="number"
                value={String(dna.networkSize)}
                onChange={(v) => setDna({ ...dna, networkSize: Number(v) || 0 })}
                placeholder="100"
              />

              {/* Hours */}
              <Field
                label="hours per week"
                type="number"
                value={String(dna.hoursPerWeek)}
                onChange={(v) => setDna({ ...dna, hoursPerWeek: Number(v) || 0 })}
                placeholder="20"
              />

              {/* Prior */}
              <Field
                label="prior startups"
                type="number"
                value={String(dna.priorStartups)}
                onChange={(v) => setDna({ ...dna, priorStartups: Number(v) || 0 })}
                placeholder="0"
              />

              {/* Industry */}
              <Field label="industry focus" value={dna.industryFocus} onChange={(v) => setDna({ ...dna, industryFocus: v })} placeholder="dev tools, fintech, …" />

              <button onClick={save} disabled={saving} className="btn w-full justify-center mt-4">
                {saving ? 'Saving…' : <>Save DNA <span className="arrow">↗</span></>}
              </button>
            </div>
          </BorderGlow>

          {/* Live radar preview */}
          <div className="space-y-6">
            <BorderGlow
              backgroundColor="#0C0F15"
              borderRadius={12}
              glowRadius={32}
              glowColor="120 100 50"
              colors={['#00FF41', '#34D399', '#A7F3D0']}
              edgeSensitivity={20}
            >
              <div className="p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--color-charge)' }}>
                  // LIVE PREVIEW
                </div>
                <DNARadar dna={dna} />
              </div>
            </BorderGlow>
          </div>
        </div>
      </div>
    </main>
  )
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted mb-2">› {label}</div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field"
      />
    </div>
  )
}
