import { useEffect, useRef, useState } from 'react'

/**
 * Cinematic full-screen boot sequence.
 * Plays once per session. ~3.6s total runtime.
 *  - ASCII wordmark
 *  - Sequential boot lines with glitch flash on key ones
 *  - Live progress bar with percentage
 *  - Final WELCOME flash
 *  - Iris-out reveal of the hero
 */
const LINES: Array<{ at: number; text: string; glitch?: boolean }> = [
  { at: 0,    text: '[ BOOT ] BIOS v0.1.3 .................. OK' },
  { at: 140,  text: '[ BOOT ] CPU detected: 1 socket / 8 core' },
  { at: 260,  text: '[ BOOT ] Memory: 16GB allocated ........ OK' },
  { at: 380,  text: '[ BOOT ] Mounting /agents .............. OK' },
  { at: 500,  text: '[ BOOT ] Mounting /reports ............. OK' },
  { at: 640,  text: '[ INIT ] Spawning kernel processes' },
  { at: 780,  text: '[ INIT ] Loading llama3.1 :: 4.9GB ..... OK' },
  { at: 940,  text: '[ INIT ] Loading mistral :: 4.4GB ...... OK', glitch: true },
  { at: 1100, text: '[ INIT ] Loading deepseek-coder :: 776MB OK' },
  { at: 1240, text: '[ NET  ] Probing 11434/tcp ............. UP' },
  { at: 1360, text: '[ NET  ] Probing 4000/tcp .............. UP' },
  { at: 1500, text: '[ LINK ] Establishing WS /agent ........ ON' },
  { at: 1640, text: '[ AUTH ] JWT signing key ............... OK' },
  { at: 1780, text: '[ DB   ] Postgres pool x10 ............. OK' },
  { at: 1920, text: '[ AGT  ] Scout :: market.demand ........ READY' },
  { at: 2040, text: '[ AGT  ] Atlas :: market.topology ...... READY' },
  { at: 2160, text: '[ AGT  ] Forge :: runtime.scaffold ..... READY' },
  { at: 2280, text: '[ AGT  ] Deck  :: narrative.export ..... READY' },
  { at: 2400, text: '[ AGT  ] Connect :: capital.match ...... READY', glitch: true },
  { at: 2540, text: '[ SYS  ] All subsystems online' },
  { at: 2700, text: '[ SYS  ] VALIDATION_ENGINE :: ONLINE' },
]

const TOTAL = 3600
const DISMISS_AT = 3300
const UNMOUNT_AT = 3700

export default function BootOverlay({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true)
  const [closing, setClosing] = useState(false)
  const [shown, setShown] = useState<typeof LINES>([])
  const [progress, setProgress] = useState(0)
  const [glitchIdx, setGlitchIdx] = useState<number | null>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    const timers: number[] = []

    LINES.forEach((l, i) => {
      timers.push(
        window.setTimeout(() => {
          setShown((s) => [...s, l])
          if (l.glitch) {
            setGlitchIdx(i)
            window.setTimeout(() => setGlitchIdx(null), 90)
          }
        }, l.at),
      )
    })

    // Progress bar animation
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min((now - start) / TOTAL, 1)
      setProgress(t)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // Dismiss
    timers.push(window.setTimeout(() => setClosing(true), DISMISS_AT))
    timers.push(
      window.setTimeout(() => {
        if (doneRef.current) return
        doneRef.current = true
        setVisible(false)
        onDone()
      }, UNMOUNT_AT),
    )

    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
    }
  }, [onDone])

  if (!visible) return null

  const progressPct = Math.round(progress * 100)
  const allShown = shown.length === LINES.length

  return (
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center ${closing ? 'boot-out' : ''}`}
      style={{ background: 'var(--color-void)' }}
    >
      {/* Grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,255,65,0.06) 1px, transparent 1px), ' +
            'linear-gradient(90deg, rgba(0,255,65,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 90%)',
        }}
      />

      {/* Scan line sweep across overlay */}
      <div
        aria-hidden
        className="absolute left-0 right-0 h-px pointer-events-none"
        style={{
          top: `${progressPct}%`,
          background: 'linear-gradient(90deg, transparent, #00FF41, transparent)',
          boxShadow: '0 0 20px #00FF41, 0 0 40px #00FF41',
          opacity: 0.7,
          transition: 'top 80ms linear',
        }}
      />

      <BootCorner pos="tl" />
      <BootCorner pos="tr" />
      <BootCorner pos="bl" />
      <BootCorner pos="br" />

      <div className="relative font-mono text-[12px] w-full max-w-[640px] px-6">
        {/* ASCII header */}
        <div className="text-center mb-6 leading-tight" style={{ color: 'var(--color-charge)' }}>
          <pre className="text-[7px] sm:text-[8px] inline-block" style={{ lineHeight: 1.05 }}>{`
   ▄▄▄        ▄████ ▓█████  ███▄    █ ▄▄▄█████▓
  ▒████▄     ██▒ ▀█▒▓█   ▀  ██ ▀█   █ ▓  ██▒ ▓▒
  ▒██  ▀█▄  ▒██░▄▄▄░▒███   ▓██  ▀█ ██▒▒ ▓██░ ▒░
  ░██▄▄▄▄██ ░▓█  ██▓▒▓█  ▄ ▓██▒  ▐▌██▒░ ▓██▓ ░
   ▓█   ▓██▒░▒▓███▀▒░▒████▒▒██░   ▓██░  ▒██▒ ░
`}</pre>
          <div className="text-[10px] tracking-[0.25em] mt-1 opacity-80">AGENTCONNECT_AI</div>
          <div className="text-[9px] tracking-[0.3em] mt-1 opacity-50">VALIDATION_ENGINE // V2.0</div>
        </div>

        {/* Boot lines — fixed height so the layout doesn't jump */}
        <div className="space-y-0.5 h-[280px] overflow-hidden" style={{ color: '#00FF41' }}>
          {shown.map((line, i) => {
            const isGlitch = glitchIdx === i
            return (
              <div
                key={i}
                className="opacity-90"
                style={{
                  textShadow: isGlitch ? '2px 0 #FF00A0, -2px 0 #00FFFF, 0 0 8px #00FF41' : '0 0 6px rgba(0,255,65,0.4)',
                  transform: isGlitch ? 'translateX(2px)' : 'none',
                  transition: 'text-shadow 80ms, transform 80ms',
                }}
              >
                {line.text}
              </div>
            )
          })}
          {!allShown && (
            <div className="opacity-60">
              <span className="opacity-80">[ .... ]</span>
              <span className="ml-2 inline-block w-2 h-3 align-middle bg-[#00FF41] animate-pulse" />
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div
            className="flex items-center justify-between text-[10px] tracking-[0.18em] uppercase mb-2"
            style={{ color: 'var(--color-charge)' }}
          >
            <span>BOOT SEQUENCE</span>
            <span className="opacity-90">{String(progressPct).padStart(3, '0')}%</span>
          </div>
          <div className="h-[3px] relative overflow-hidden" style={{ background: 'rgba(0,255,65,0.12)' }}>
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${progressPct}%`,
                background: 'var(--color-charge)',
                boxShadow: '0 0 12px var(--color-charge), 0 0 24px var(--color-charge)',
              }}
            />
          </div>
          {/* segmented overlay for that "blocky terminal" look */}
          <div
            aria-hidden
            className="absolute left-0 right-0 mt-[-3px] h-[3px] pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 18px, var(--color-void) 18px 19px)',
            }}
          />
        </div>

        {/* Footer hint — flashes WELCOME when complete */}
        <div className="mt-6 text-center text-[10px] tracking-[0.25em] uppercase" style={{ color: 'var(--color-charge)' }}>
          {allShown ? (
            <span className="inline-block animate-pulse" style={{ textShadow: '0 0 12px #00FF41' }}>
              WELCOME, OPERATOR
            </span>
          ) : (
            <span className="opacity-50">› BOOTING …</span>
          )}
        </div>
      </div>
    </div>
  )
}

function BootCorner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const common: React.CSSProperties = {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: 'var(--color-charge)',
    opacity: 0.65,
    boxShadow: '0 0 12px rgba(0,255,65,0.4)',
  }
  const m: Record<typeof pos, React.CSSProperties> = {
    tl: { top: 24, left: 24, borderTop: '1px solid', borderLeft: '1px solid' },
    tr: { top: 24, right: 24, borderTop: '1px solid', borderRight: '1px solid' },
    bl: { bottom: 24, left: 24, borderBottom: '1px solid', borderLeft: '1px solid' },
    br: { bottom: 24, right: 24, borderBottom: '1px solid', borderRight: '1px solid' },
  }
  return <div aria-hidden style={{ ...common, ...m[pos] }} />
}
