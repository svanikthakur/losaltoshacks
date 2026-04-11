import { useEffect, useState } from 'react'

/**
 * Live HH:MM:SS clock. Seconds digits flip on each tick.
 */
export default function LiveClock({ className }: { className?: string }) {
  const [time, setTime] = useState(() => new Date())
  const [flip, setFlip] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date())
      setFlip(true)
      const t = setTimeout(() => setFlip(false), 80)
      return () => clearTimeout(t)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const pad = (n: number) => String(n).padStart(2, '0')
  const h = pad(time.getHours())
  const m = pad(time.getMinutes())
  const s = pad(time.getSeconds())

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {h}:{m}:
      <span
        style={{
          display: 'inline-block',
          transform: flip ? 'scaleY(0.8)' : 'scaleY(1)',
          transition: 'transform 80ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {s}
      </span>
    </span>
  )
}
