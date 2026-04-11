import { ReactNode } from 'react'

/**
 * HUD frame with acid-lime corner brackets at all 4 corners.
 * Use to wrap any panel that should feel like a scope / target.
 */
export default function CornerFrame({
  children,
  className = '',
  padding = 'p-6 md:p-8',
}: {
  children: ReactNode
  className?: string
  padding?: string
}) {
  return (
    <div className={`relative brackets ${padding} ${className}`}>
      <span className="bracket-bl" aria-hidden />
      <span className="bracket-br" aria-hidden />
      {children}
    </div>
  )
}
