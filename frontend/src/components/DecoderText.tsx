import { useEffect, useRef, useState } from 'react'

/**
 * Decoder / scramble text animation.
 * Cycles random chars in each position, then locks char-by-char left→right
 * onto the final string.
 */
export default function DecoderText({
  text,
  startDelay = 0,
  duration = 900,
  className,
  as: Tag = 'span',
  trigger = 'mount',
}: {
  text: string
  startDelay?: number
  duration?: number
  className?: string
  as?: keyof JSX.IntrinsicElements
  /** 'mount' fires on mount; 'view' fires on scroll intersection */
  trigger?: 'mount' | 'view'
}) {
  const [out, setOut] = useState<string>(() => scramble(text))
  const ref = useRef<HTMLElement | null>(null)
  const started = useRef(false)

  const start = () => {
    if (started.current) return
    started.current = true
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setOut(text)
      return
    }

    const chars = text.split('')
    const frameMs = 40
    const totalFrames = Math.max(6, Math.floor(duration / frameMs))
    const lockFrame = new Array(chars.length).fill(0).map((_, i) =>
      Math.floor((i / chars.length) * (totalFrames * 0.85)),
    )

    let frame = 0
    const id = setInterval(() => {
      frame++
      let next = ''
      for (let i = 0; i < chars.length; i++) {
        if (chars[i] === ' ') {
          next += ' '
          continue
        }
        if (frame >= lockFrame[i]) {
          next += chars[i]
        } else {
          next += randomGlyph()
        }
      }
      setOut(next)
      if (frame >= totalFrames) {
        clearInterval(id)
        setOut(text)
      }
    }, frameMs)
  }

  useEffect(() => {
    if (trigger === 'mount') {
      const t = setTimeout(start, startDelay)
      return () => clearTimeout(t)
    }
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setTimeout(start, startDelay)
            io.disconnect()
          }
        }
      },
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  // @ts-expect-error ref typing loose
  return <Tag ref={ref} className={className}>{out}</Tag>
}

const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*<>?/\\'
function randomGlyph() {
  return POOL[Math.floor(Math.random() * POOL.length)]
}
function scramble(s: string) {
  return s
    .split('')
    .map((c) => (c === ' ' ? ' ' : randomGlyph()))
    .join('')
}
