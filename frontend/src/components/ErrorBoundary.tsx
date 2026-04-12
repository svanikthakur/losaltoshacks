import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, info: ErrorInfo | null) => ReactNode
}

interface State {
  error: Error | null
  info: ErrorInfo | null
}

/**
 * Catches render-time errors in its children and shows a readable fallback
 * instead of letting React unmount the whole tree (which looks like a black
 * screen). Logs the error stack to the console for devtools inspection.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info)
    this.setState({ info })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.state.info)
      return (
        <main className="pt-32 pb-24 min-h-screen">
          <div className="shell">
            <div
              className="border p-8 font-mono text-sm"
              style={{ borderColor: 'rgba(251,113,133,0.4)', background: 'rgba(251,113,133,0.05)' }}
            >
              <div className="text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: '#FB7185' }}>
                // RENDER ERROR
              </div>
              <div className="text-[#FB7185] text-base mb-4">{this.state.error.message}</div>
              {this.state.error.stack && (
                <pre className="text-xs text-ink-dim whitespace-pre-wrap leading-relaxed overflow-x-auto">
                  {this.state.error.stack}
                </pre>
              )}
              {this.state.info?.componentStack && (
                <pre className="text-[10px] text-muted whitespace-pre-wrap leading-relaxed mt-4 overflow-x-auto">
                  {this.state.info.componentStack}
                </pre>
              )}
            </div>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
