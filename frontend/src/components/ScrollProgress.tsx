import { useEffect, useState } from 'react'

/**
 * Vertical scroll-progress indicator on the right edge.
 * Shows percentage in mono, and a thin accent line that fills as you scroll.
 */
export default function ScrollProgress() {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const p = max > 0 ? (window.scrollY / max) * 100 : 0
      setPct(Math.max(0, Math.min(100, p)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <aside
      aria-hidden
      className="fixed right-4 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col items-center gap-3 pointer-events-none"
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">scroll</div>
      <div className="relative w-px h-48 bg-line-strong">
        <div
          className="absolute left-0 right-0 top-0 bg-accent"
          style={{ height: `${pct}%`, transition: 'height 60ms linear' }}
        />
      </div>
      <div className="font-mono text-[10px] tabular-nums text-ink-dim">{String(Math.round(pct)).padStart(3, '0')}</div>
    </aside>
  )
}
