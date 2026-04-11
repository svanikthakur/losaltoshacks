import { motion, useMotionValue, useSpring } from 'framer-motion'
import { ReactNode, useRef } from 'react'
import clsx from 'clsx'

type Props = {
  children: ReactNode
  onClick?: () => void
  className?: string
  as?: 'button' | 'a'
  href?: string
  variant?: 'primary' | 'ghost'
}

export default function MagneticButton({ children, onClick, className, href, variant = 'primary' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 260, damping: 22 })
  const sy = useSpring(y, { stiffness: 260, damping: 22 })

  const handleMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left - rect.width / 2
    const my = e.clientY - rect.top - rect.height / 2
    x.set(mx * 0.25)
    y.set(my * 0.25)
  }
  const handleLeave = () => {
    x.set(0)
    y.set(0)
  }

  const cls = clsx(variant === 'primary' ? 'btn-primary' : 'btn-ghost', className)
  const inner = (
    <motion.div style={{ x: sx, y: sy }} className="inline-block">
      <span className={cls}>{children}</span>
    </motion.div>
  )
  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave} className="inline-block">
      {href ? (
        <a href={href} onClick={onClick}>
          {inner}
        </a>
      ) : (
        <button type="button" onClick={onClick}>
          {inner}
        </button>
      )}
    </div>
  )
}
