import { useEffect, useRef, useState } from 'react'
import Reveal from './Reveal'
import BorderGlow from './BorderGlow'
import Antigravity from './Antigravity'

/**
 * "Three Steps to a Fundable Startup Package" — three vertically stacked steps,
 * each with its own shade of green (matrix → emerald → mint) and a unique
 * mockup on the right side. Antigravity particles drift behind the section.
 */
const STEP_ACCENTS = {
  '01': {
    chip: '#00FF41',       // matrix green
    chipBg: 'rgba(0,255,65,0.08)',
    chipBorder: 'rgba(0,255,65,0.40)',
    numeral: 'rgba(0,255,65,0.18)',
    glow: 'rgba(0,255,65,0.30)',
    glowHsl: '120 100 50',
    cardColors: ['#00FF41', '#34D399', '#A7F3D0'],
  },
  '02': {
    chip: '#34D399',       // emerald
    chipBg: 'rgba(52,211,153,0.08)',
    chipBorder: 'rgba(52,211,153,0.40)',
    numeral: 'rgba(16,185,129,0.18)',
    glow: 'rgba(16,185,129,0.30)',
    glowHsl: '160 84 45',
    cardColors: ['#34D399', '#00FF41', '#A7F3D0'],
  },
  '03': {
    chip: '#A7F3D0',       // mint
    chipBg: 'rgba(167,243,208,0.08)',
    chipBorder: 'rgba(167,243,208,0.40)',
    numeral: 'rgba(110,231,183,0.18)',
    glow: 'rgba(110,231,183,0.30)',
    glowHsl: '152 76 80',
    cardColors: ['#A7F3D0', '#6EE7B7', '#34D399'],
  },
} as const

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-28 md:py-36 overflow-hidden">
      {/* Antigravity particles drifting behind everything */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          opacity: 0.35,
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 90%)',
        }}
      >
        <Antigravity
          count={220}
          magnetRadius={5}
          ringRadius={6}
          waveSpeed={0.3}
          waveAmplitude={0.8}
          particleSize={1.2}
          lerpSpeed={0.04}
          color="#00FF41"
          autoAnimate
          particleVariance={1}
          rotationSpeed={0.02}
          depthFactor={1}
          pulseSpeed={2.5}
          particleShape="capsule"
          fieldStrength={10}
        />
      </div>

      <div className="shell relative" style={{ zIndex: 1 }}>
      {/* Heading */}
      <div className="text-center mb-24 md:mb-32">
        <Reveal>
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full text-[11px] tracking-[0.2em] uppercase font-mono"
            style={{
              color: 'var(--color-charge)',
              background: 'rgba(0,255,65,0.06)',
              border: '1px solid rgba(0,255,65,0.30)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-charge)]" />
            HOW IT WORKS
          </div>
        </Reveal>
        <Reveal delay={80}>
          <h2
            className="font-display font-black uppercase leading-[0.95] tracking-[-0.01em] mx-auto max-w-5xl"
            style={{ fontSize: 'clamp(40px, 6vw, 92px)' }}
          >
            Three Steps to a Fundable
            <br />
            Startup Package
          </h2>
        </Reveal>
      </div>

      {/* Steps */}
      <div className="space-y-32 md:space-y-44">
        <Step01 />
        <Step02 />
        <Step03 />
      </div>
      </div>
    </section>
  )
}

/* ================================================================
   Shared step shell — left column with chip + huge numeral + headline + body,
   right column slot for the per-step mockup.
   ================================================================ */
function StepShell({
  num,
  title,
  body,
  children,
}: {
  num: '01' | '02' | '03'
  title: string
  body: string
  children: React.ReactNode
}) {
  const a = STEP_ACCENTS[num]
  return (
    <div className="grid grid-cols-12 gap-8 md:gap-14 items-start">
      {/* Left — text */}
      <div className="col-span-12 lg:col-span-5 relative">
        {/* Huge numeral behind everything */}
        <div
          aria-hidden
          className="absolute -top-12 -left-4 select-none pointer-events-none font-display font-black leading-[0.85]"
          style={{
            fontSize: 'clamp(180px, 18vw, 280px)',
            color: a.numeral,
            zIndex: 0,
            letterSpacing: '-0.05em',
          }}
        >
          {num}
        </div>

        <Reveal>
          <div
            className="relative inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-full text-[11px] tracking-[0.2em] uppercase font-mono"
            style={{
              color: a.chip,
              background: a.chipBg,
              border: `1px solid ${a.chipBorder}`,
              zIndex: 1,
            }}
          >
            STEP {num}
          </div>
        </Reveal>

        <Reveal delay={60}>
          <h3
            className="relative font-display font-black uppercase leading-[0.92] tracking-[-0.01em]"
            style={{ fontSize: 'clamp(38px, 4.5vw, 64px)', zIndex: 1 }}
          >
            {title}
          </h3>
        </Reveal>

        <Reveal delay={120}>
          <p
            className="relative mt-6 text-lg leading-[1.65] max-w-md"
            style={{ color: 'var(--color-text-2)', zIndex: 1 }}
          >
            {body}
          </p>
        </Reveal>
      </div>

      {/* Right — mockup slot */}
      <div className="col-span-12 lg:col-span-7">
        <Reveal delay={160}>{children}</Reveal>
      </div>
    </div>
  )
}

/* ================================================================
   STEP 01 — Type your idea (terminal mockup with traffic lights)
   ================================================================ */
function Step01() {
  return (
    <StepShell
      num="01"
      title="Type Your Idea"
      body="Enter your startup idea in plain English. No formatting, no jargon. Just your raw vision — in one paragraph."
    >
      <BorderGlow
        backgroundColor="#0C0F15"
        borderRadius={20}
        glowRadius={40}
        glowColor="120 100 50"
        colors={['#00FF41', '#34D399', '#A7F3D0']}
        edgeSensitivity={20}
      >
        <div className="p-6 md:p-8 relative">
          {/* Traffic lights */}
          <div className="flex items-center gap-2 mb-6">
            <span className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
          </div>

          <div className="border-t border-white/5 pt-5">
            {/* Code line */}
            <div className="font-mono text-[15px]" style={{ color: 'rgba(220,255,235,0.85)' }}>
              <span style={{ color: '#00FF41' }}>&gt;</span> Describe your idea
              <span style={{ color: 'rgba(245,245,240,0.4)' }}>...</span>
            </div>
            {/* Underline */}
            <div className="h-px mt-2" style={{ background: 'rgba(0,255,65,0.35)' }} />

            {/* Fake placeholder lines */}
            <div className="mt-6 space-y-3">
              <div className="h-1.5 rounded-full" style={{ background: 'rgba(0,255,65,0.10)', width: '85%' }} />
              <div className="h-1.5 rounded-full" style={{ background: 'rgba(0,255,65,0.10)', width: '60%' }} />
              <div className="h-1.5 rounded-full" style={{ background: 'rgba(0,255,65,0.10)', width: '70%' }} />
            </div>
          </div>

          {/* Submit button — green */}
          <button
            type="button"
            className="mt-8 w-full flex items-center justify-center gap-3 py-4 font-mono text-[11px] tracking-[0.2em] uppercase relative overflow-hidden group"
            style={{
              background: 'var(--color-charge)',
              color: 'var(--color-void)',
              boxShadow: '0 16px 40px -16px rgba(0,255,65,0.6)',
            }}
          >
            <span>SUBMIT IDEA</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>

          {/* Char counter */}
          <div
            className="mt-4 flex items-center justify-between text-[10px] tracking-[0.15em] uppercase font-mono"
            style={{ color: 'rgba(245,245,240,0.4)' }}
          >
            <span>0 / 500 CHARS</span>
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full" style={{ background: '#00FF41' }} />
              <span className="w-1 h-1 rounded-full" style={{ background: '#00FF41' }} />
              <span className="w-1 h-1 rounded-full" style={{ background: '#00FF41' }} />
            </span>
          </div>
        </div>
      </BorderGlow>
    </StepShell>
  )
}

/* ================================================================
   STEP 02 — Watch agents work (system_logs terminal)
   ================================================================ */
function Step02() {
  const lines = [
    { tag: 'Scout',  msg: 'Reddit: 23 threads discussing this problem' },
    { tag: 'Forge',  msg: 'Scaffolding React app... components generated' },
    { tag: 'Atlas',  msg: 'TAM identified: $4.2B global market' },
    { tag: 'Deck',   msg: 'Generating slide 4 of 12...' },
    { tag: 'Deck',   msg: 'Sequoia-format structure finalized' },
    { tag: 'System', msg: 'Processing complete. Finalizing package...' },
  ]
  return (
    <StepShell
      num="02"
      title="Watch 4 Agents Work"
      body="Scout, Forge, Atlas, and Deck run in sequence, each building on the previous output — processing your idea in real time."
    >
      <BorderGlow
        backgroundColor="#080B10"
        borderRadius={20}
        glowRadius={40}
        glowColor="160 84 45"
        colors={['#34D399', '#00FF41', '#A7F3D0']}
        edgeSensitivity={20}
      >
        <div className="overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor: 'rgba(52,211,153,0.18)' }}
          >
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em]" style={{ color: '#34D399' }}>
              <span className="inline-block w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              &gt;_ SYSTEM_LOGS
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white/15" />
              <span className="w-2 h-2 rounded-full bg-white/15" />
            </div>
          </div>

          {/* Logs */}
          <div className="px-6 py-5 font-mono text-[13px] leading-[1.9]" style={{ color: '#10B981' }}>
            <TypewriterLogs lines={lines} />
          </div>
        </div>
      </BorderGlow>
    </StepShell>
  )
}

function TypewriterLogs({ lines }: { lines: { tag: string; msg: string }[] }) {
  const [shown, setShown] = useState<number>(0)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(lines.length)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            io.disconnect()
            let i = 0
            const tick = () => {
              i++
              setShown(i)
              if (i < lines.length) setTimeout(tick, 380)
            }
            setTimeout(tick, 200)
          }
        }
      },
      { threshold: 0.3 },
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [lines.length])

  return (
    <div ref={ref}>
      {lines.slice(0, shown).map((l, i) => (
        <div key={i}>
          &gt; <span style={{ color: '#34D399' }}>[{l.tag}]</span>{' '}
          <span style={{ color: 'rgba(220,255,235,0.85)' }}>{l.msg}</span>
        </div>
      ))}
      {shown < lines.length && (
        <span className="inline-block w-2.5 h-4 align-middle" style={{ background: '#10B981' }} />
      )}
    </div>
  )
}

/* ================================================================
   STEP 03 — Download cards
   ================================================================ */
function Step03() {
  const files = [
    { icon: 'doc', name: 'Validation_Report.pdf', sub: 'Demand analysis + quotes' },
    { icon: 'panel', name: 'MVP_Scaffold.zip',     sub: 'React starter + Vercel' },
    { icon: 'chart', name: 'Market_Research.pdf',  sub: 'TAM/SAM/SOM + GTM' },
    { icon: 'target', name: 'Pitch_Deck.pptx',     sub: '12-slide Sequoia format' },
  ] as const

  return (
    <StepShell
      num="03"
      title="Download Your Full Package"
      body="In under 10 minutes, your complete investor-ready package is ready to download."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {files.map((f, i) => (
          <Reveal key={f.name} delay={i * 60}>
            <DownloadCard icon={f.icon} name={f.name} sub={f.sub} />
          </Reveal>
        ))}
      </div>
    </StepShell>
  )
}

function DownloadCard({ icon, name, sub }: { icon: 'doc' | 'panel' | 'chart' | 'target'; name: string; sub: string }) {
  return (
    <BorderGlow
      backgroundColor="#0C0F15"
      borderRadius={16}
      glowRadius={32}
      glowColor="120 100 50"
      colors={['#00FF41', '#34D399', '#A7F3D0']}
      edgeSensitivity={20}
    >
      <div className="p-6 cursor-pointer">
        {/* Icon tile */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
          style={{
            background: 'rgba(0,255,65,0.08)',
            border: '1px solid rgba(0,255,65,0.30)',
            color: '#00FF41',
          }}
        >
          <FileIcon kind={icon} />
        </div>

        <div className="font-display text-xl font-semibold tracking-tight" style={{ color: 'var(--color-text-1)' }}>
          {name}
        </div>
        <div className="mt-1 text-sm" style={{ color: 'var(--color-text-2)' }}>
          {sub}
        </div>

        <div
          className="mt-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-mono"
          style={{ color: 'rgba(245,245,240,0.5)' }}
        >
          DOWNLOAD
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
      </div>
    </BorderGlow>
  )
}

function FileIcon({ kind }: { kind: 'doc' | 'panel' | 'chart' | 'target' }) {
  const common = { width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  if (kind === 'doc')
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    )
  if (kind === 'panel')
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="9" x2="9" y2="21" />
      </svg>
    )
  if (kind === 'chart')
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
      </svg>
    )
  return (
    <svg viewBox="0 0 24 24" {...common}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}
