import { useEffect, useRef, useState } from 'react'

/**
 * Full-screen boot sequence. Shows once per session.
 * Types a few kernel lines, fills a progress bar, dismisses with a
 * clip-path iris-out. Total runtime ~1600ms.
 */
const LINES = [
  { t: 0,    txt: '[ BOOT ] INIT KERNEL ............. OK' },
  { t: 220,  txt: '[ BOOT ] MOUNT /agents ............ OK' },
  { t: 420,  txt: '[ BOOT ] LOAD LLAMA3.1 ............ OK' },
  { t: 620,  txt: '[ BOOT ] LOAD MISTRAL ............. OK' },
  { t: 820,  txt: '[ BOOT ] LOAD DEEPSEEK-CODER ...... OK' },
  { t: 1020, txt: '[ LINK ] OPEN WS /agent ........... OK' },
  { t: 1180, txt: '[ SYS  ] VALIDATION_ENGINE ONLINE.' },
]

export default function BootOverlay({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true)
  const [closing, setClosing] = useState(false)
  const [shown, setShown] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const doneRef = useRef(false)

  useEffect(() => {
    const timers: number[] = []

    // Stream lines
    LINES.forEach((l) => {
      timers.push(window.setTimeout(() => {
        setShown((s) => [...s, l.txt])
      }, l.t))
    })

    // Progress
    const start = performance.now()
    const duration = 1350
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      setProgress(t)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // Dismiss
    const dismiss = window.setTimeout(() => {
      setClosing(true)
    }, 1500)
    const unmount = window.setTimeout(() => {
      if (doneRef.current) return
      doneRef.current = true
      setVisible(false)
      onDone()
    }, 2050)

    timers.push(dismiss, unmount)

    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
    }
  }, [onDone])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center ${closing ? 'boot-out' : ''}`}
      style={{ background: 'var(--color-void)' }}
    >
      {/* Grid inside the boot overlay for visual continuity */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,255,65,0.04) 1px, transparent 1px), ' +
            'linear-gradient(90deg, rgba(0,255,65,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, black 30%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, black 30%, transparent 90%)',
        }}
      />

      {/* Corner brackets */}
      <BootCorner pos="tl" />
      <BootCorner pos="tr" />
      <BootCorner pos="bl" />
      <BootCorner pos="br" />

      <div className="relative font-mono text-[13px] w-full max-w-[560px] px-6">
        {/* ascii header */}
        <div className="text-center mb-8 leading-tight" style={{ color: 'var(--color-charge)' }}>
          <div className="text-[10px] tracking-[0.2em] opacity-60">▓▒░ AGENTCONNECT_AI ░▒▓</div>
          <div className="text-[10px] tracking-[0.2em] opacity-40 mt-1">VALIDATION_ENGINE // V0.1.3</div>
        </div>

        {/* lines */}
        <div className="space-y-1" style={{ color: 'var(--color-charge)' }}>
          {shown.map((line, i) => (
            <div key={i} className="flex items-center justify-between">
              <span>{line}</span>
            </div>
          ))}
          {shown.length < LINES.length && (
            <div className="opacity-60">
              <span className="opacity-80">[ ....  ]</span>
              <span className="ml-2 animate-pulse">▊</span>
            </div>
          )}
        </div>

        {/* progress bar */}
        <div className="mt-8">
          <div className="flex items-center justify-between text-[10px] tracking-[0.15em] opacity-60 mb-2" style={{ color: 'var(--color-charge)' }}>
            <span>BOOT</span>
            <span>{Math.round(progress * 100).toString().padStart(3, '0')}%</span>
          </div>
          <div className="h-[2px]" style={{ background: 'rgba(0,255,65,0.15)' }}>
            <div
              className="h-full"
              style={{ width: `${progress * 100}%`, background: 'var(--color-charge)', boxShadow: '0 0 12px var(--color-charge)' }}
            />
          </div>
        </div>

        {/* footer hint */}
        <div className="mt-6 text-center text-[10px] tracking-[0.2em] opacity-50" style={{ color: 'var(--color-charge)' }}>
          PRESS ANY KEY TO ENTER
        </div>
      </div>
    </div>
  )
}

function BootCorner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const common: React.CSSProperties = {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: 'var(--color-charge)',
    opacity: 0.7,
  }
  const m: Record<typeof pos, React.CSSProperties> = {
    tl: { top: 24, left: 24, borderTop: '1px solid', borderLeft: '1px solid' },
    tr: { top: 24, right: 24, borderTop: '1px solid', borderRight: '1px solid' },
    bl: { bottom: 24, left: 24, borderBottom: '1px solid', borderLeft: '1px solid' },
    br: { bottom: 24, right: 24, borderBottom: '1px solid', borderRight: '1px solid' },
  }
  return <div aria-hidden style={{ ...common, ...m[pos] }} />
}
