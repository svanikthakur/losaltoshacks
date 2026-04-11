import { useEffect, useState } from 'react'

/**
 * Typewriter that types `text` one char at a time, then every `glitchInterval`
 * flickers a random index to a random character for 60ms.
 */
export default function LiveText({
  text,
  typeDelay = 40,
  startDelay = 0,
  glitchInterval = 8000,
  className,
}: {
  text: string
  typeDelay?: number
  startDelay?: number
  glitchInterval?: number
  className?: string
}) {
  const [out, setOut] = useState('')
  const [cursor, setCursor] = useState(true)
  const [typed, setTyped] = useState(false)

  // Typewriter
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setOut(text)
      setTyped(true)
      setCursor(false)
      return
    }
    let i = 0
    let raf = 0
    const start = setTimeout(() => {
      const step = () => {
        i++
        setOut(text.slice(0, i))
        if (i < text.length) raf = window.setTimeout(step, typeDelay) as unknown as number
        else setTyped(true)
      }
      step()
    }, startDelay)
    return () => {
      clearTimeout(start)
      clearTimeout(raf)
    }
  }, [text, typeDelay, startDelay])

  // Cursor blink for 3 ticks after typing, then hide
  useEffect(() => {
    if (!typed) return
    let n = 0
    const id = setInterval(() => {
      setCursor((c) => !c)
      n++
      if (n >= 6) {
        clearInterval(id)
        setCursor(false)
      }
    }, 220)
    return () => clearInterval(id)
  }, [typed])

  // Periodic glitch
  useEffect(() => {
    if (!typed) return
    const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'
    const id = setInterval(() => {
      const i = Math.floor(Math.random() * text.length)
      const c = pool[Math.floor(Math.random() * pool.length)]
      const swapped = text.slice(0, i) + c + text.slice(i + 1)
      setOut(swapped)
      setTimeout(() => setOut(text), 60)
    }, glitchInterval)
    return () => clearInterval(id)
  }, [typed, text, glitchInterval])

  return (
    <span className={className}>
      {out}
      {cursor && <span className="opacity-70">▍</span>}
    </span>
  )
}
