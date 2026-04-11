import { useEffect } from 'react'

/**
 * Custom amber cursor.
 *  - 8px amber square (not circle)
 *  - 28px lerped ring trailing behind
 *  - state changes via body[data-cursor] attribute
 *  - disabled on touch / reduced-motion (CSS handles it)
 */
export default function Cursor() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const dot = document.createElement('div')
    dot.id = 'cursor-dot'
    const ring = document.createElement('div')
    ring.id = 'cursor-ring'
    document.body.appendChild(dot)
    document.body.appendChild(ring)
    document.documentElement.classList.add('has-cursor')

    let mx = window.innerWidth / 2
    let my = window.innerHeight / 2
    let dx = mx
    let dy = my
    let rx = mx
    let ry = my
    let raf = 0

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
    }
    const onDown = () => document.body.setAttribute('data-cursor-click', '1')
    const onUp = () => document.body.removeAttribute('data-cursor-click')
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)

    const onEnter = (e: Event) => {
      const t = (e.target as HTMLElement)?.closest?.('[data-cursor]') as HTMLElement | null
      if (t) document.body.setAttribute('data-cursor', t.dataset.cursor || 'default')
    }
    const onLeave = () => document.body.removeAttribute('data-cursor')
    document.addEventListener('mouseover', onEnter)
    document.addEventListener('mouseout', onLeave)

    const tick = () => {
      dx += (mx - dx) * 0.6
      dy += (my - dy) * 0.6
      rx += (mx - rx) * 0.14
      ry += (my - ry) * 0.14
      dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseover', onEnter)
      document.removeEventListener('mouseout', onLeave)
      document.body.removeAttribute('data-cursor')
      document.body.removeAttribute('data-cursor-click')
      document.documentElement.classList.remove('has-cursor')
      dot.remove()
      ring.remove()
    }
  }, [])

  return null
}
