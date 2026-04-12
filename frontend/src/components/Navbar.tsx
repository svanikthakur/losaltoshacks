import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

/**
 * 48px system status bar. Wordmark in Fragment Mono, no logo glyph.
 * Right side: live online dot + ACCESS/SIGN OUT button.
 */
export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header
      className="fixed top-0 inset-x-0 z-50"
      style={{
        height: 48,
        background: 'rgba(7, 9, 13, 0.9)',
        backdropFilter: 'blur(16px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
        borderBottom: '1px solid var(--color-border-1)',
      }}
    >
      <div className="shell h-full flex items-center justify-between">
        {/* Wordmark — bracketed VENTURE AI with subtitle */}
        <Link
          to="/"
          data-cursor="link"
          className="flex items-baseline gap-2 select-none"
        >
          <span className="font-mono text-[14px] leading-none" style={{ color: 'var(--color-charge)' }}>
            [
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display font-extrabold tracking-[0.18em] uppercase text-[15px] text-ink">
              VENTURE <span style={{ color: 'var(--color-text-2)' }}>AI</span>
            </span>
            <span className="font-mono text-[8px] tracking-[0.25em] uppercase mt-0.5" style={{ color: 'var(--color-text-2)' }}>
              v2.0 // ai platform
            </span>
          </span>
          <span className="font-mono text-[14px] leading-none" style={{ color: 'var(--color-charge)' }}>
            ]
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6">
          {[
            ['AGENTS', '#agents'],
            ['METHOD', '#method'],
            ['RUNTIME', '#runtime'],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              data-cursor="link"
              className="nav-link"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Right — status + auth */}
        <div className="flex items-center gap-5">
          <div className="hidden md:flex items-center gap-2 font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: 'var(--color-online)' }}>
            <span className="live-dot" />
            ONLINE
          </div>

          {user ? (
            <>
              <Link to="/dashboard" data-cursor="link" className="nav-link hidden sm:inline-block">
                STUDIO
              </Link>
              <button onClick={logout} data-cursor="link" className="btn-link">
                SIGN OUT
              </button>
            </>
          ) : (
            <>
              <Link to="/login" data-cursor="link" className="nav-link hidden sm:inline-block">
                SIGN IN
              </Link>
              <Link
                to="/signup"
                data-cursor="link"
                className="font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2"
                style={{
                  background: 'var(--color-charge)',
                  color: 'var(--color-void)',
                }}
              >
                ACCESS ↗
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
