import { useEffect, useRef } from 'react'

/**
 * Background environment.
 *  - grain + scan lines live on body::before / body::after (index.css)
 *  - matrix rain canvas (subtle, low opacity, slow fall)
 *  - mouse-tracked heat bloom (lerped radial)
 *  - four corner targeting reticles
 */
export default function Background() {
  const bloomRef = useRef<HTMLDivElement>(null)
  const rainRef = useRef<HTMLCanvasElement>(null)

  /* ───── mouse bloom ───── */
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const el = bloomRef.current
    if (!el) return

    let tx = window.innerWidth / 2
    let ty = window.innerHeight / 2
    let cx = tx
    let cy = ty
    let raf = 0

    const onMove = (e: MouseEvent) => {
      tx = e.clientX
      ty = e.clientY
    }
    window.addEventListener('mousemove', onMove, { passive: true })

    const tick = () => {
      cx += (tx - cx) * 0.05
      cy += (ty - cy) * 0.05
      el.style.background = `radial-gradient(800px circle at ${Math.round(cx)}px ${Math.round(cy)}px, rgba(0,255,65,0.06), transparent 65%)`
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  /* ───── matrix rain ───── */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = rainRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Katakana + digits — classic matrix glyph set
    const glyphs = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ0123456789<>/\\[]{}=+-*'
    const fontSize = 14
    const cols = Math.floor(window.innerWidth / fontSize)
    const drops = new Array(cols).fill(0).map(() => Math.random() * -50)

    let raf = 0
    const frame = () => {
      // Dark overlay creates the trailing-fade effect
      ctx.fillStyle = 'rgba(7, 9, 13, 0.08)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = 'rgba(0, 255, 65, 0.55)'
      ctx.font = `${fontSize}px 'Fragment Mono', monospace`

      for (let i = 0; i < drops.length; i++) {
        const ch = glyphs[Math.floor(Math.random() * glyphs.length)]
        const x = i * fontSize
        const y = drops[i] * fontSize
        ctx.fillText(ch, x, y)

        // Bright head
        if (Math.random() > 0.975) {
          ctx.fillStyle = 'rgba(220, 255, 230, 0.9)'
          ctx.fillText(ch, x, y)
          ctx.fillStyle = 'rgba(0, 255, 65, 0.55)'
        }

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i] += 0.4
      }
      raf = requestAnimationFrame(frame)
    }
    frame()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <>
      {/* Matrix rain — behind everything, subtle */}
      <canvas
        ref={rainRef}
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ opacity: 0.14, mixBlendMode: 'screen' }}
      />

      {/* Mouse heat bloom */}
      <div
        ref={bloomRef}
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
      />

      {/* Corner targeting reticles */}
      <Reticle pos="tl" />
      <Reticle pos="tr" />
      <Reticle pos="bl" />
      <Reticle pos="br" />
    </>
  )
}

function Reticle({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const style: Record<typeof pos, React.CSSProperties> = {
    tl: {
      top: 14,
      left: 14,
      borderTop: '1px solid var(--color-charge)',
      borderLeft: '1px solid var(--color-charge)',
    },
    tr: {
      top: 14,
      right: 14,
      borderTop: '1px solid var(--color-charge)',
      borderRight: '1px solid var(--color-charge)',
    },
    bl: {
      bottom: 14,
      left: 14,
      borderBottom: '1px solid var(--color-charge)',
      borderLeft: '1px solid var(--color-charge)',
    },
    br: {
      bottom: 14,
      right: 14,
      borderBottom: '1px solid var(--color-charge)',
      borderRight: '1px solid var(--color-charge)',
    },
  }
  return (
    <div
      aria-hidden
      className="fixed z-[2] pointer-events-none anim-fade"
      style={{
        width: 28,
        height: 28,
        opacity: 0.35,
        animationDelay: '0ms',
        animationDuration: '500ms',
        ...style[pos],
      }}
    />
  )
}
