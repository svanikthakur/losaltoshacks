/**
 * Agent orchestrator — wraps an agent call with a hard timeout and a background
 * retry path.
 *
 *  - 15s soft cap (per spec). If the agent finishes in time, return ok.
 *  - If the cap fires, return { ok: false, partial: true } so the pipeline can
 *    keep moving WITHOUT blocking.
 *  - The original promise keeps running in the background; when it eventually
 *    settles, the onLate callback fires so the caller can patch the DB and
 *    broadcast a "late_arrival" WS event.
 *
 * Tunable: set AGENT_TIMEOUT_MS in env to override the cap (default 15000).
 */
const DEFAULT_TIMEOUT_MS = Number(process.env.AGENT_TIMEOUT_MS || 15_000)

export type AgentResult<T> =
  | { ok: true; data: T; partial: false }
  | { ok: false; partial: true; error: string }

interface RunOpts<T> {
  /** Human-readable agent name for logging */
  name: string
  /** The agent's promise factory */
  fn: () => Promise<T>
  /** Soft timeout in ms (default from env or 15000) */
  timeoutMs?: number
  /** Called if the agent finishes AFTER the soft timeout — for DB patching */
  onLate?: (data: T) => void | Promise<void>
  /** Called if the eventual retry errors out */
  onLateError?: (err: Error) => void
}

/**
 * Run an agent with a soft timeout. Returns a typed result. The original
 * promise is NOT cancelled — if it eventually resolves, onLate fires.
 */
export async function runAgentWithTimeout<T>(opts: RunOpts<T>): Promise<AgentResult<T>> {
  const cap = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const start = Date.now()

  let settled = false
  const realPromise = opts.fn()

  // Tap the original promise to fire onLate / onLateError
  realPromise
    .then((data) => {
      const elapsed = Date.now() - start
      if (settled && elapsed > cap && opts.onLate) {
        console.log(`[orchestrator:${opts.name}] late arrival after ${elapsed}ms`)
        Promise.resolve(opts.onLate(data)).catch((err) => {
          console.warn(`[orchestrator:${opts.name}] onLate threw:`, (err as Error).message)
        })
      }
    })
    .catch((err) => {
      if (settled && opts.onLateError) {
        console.warn(`[orchestrator:${opts.name}] late retry failed:`, (err as Error).message)
        opts.onLateError(err as Error)
      }
    })

  // Race against the cap
  const timeoutPromise = new Promise<AgentResult<T>>((resolve) => {
    setTimeout(() => {
      if (settled) return
      settled = true
      console.warn(
        `[orchestrator:${opts.name}] soft timeout fired at ${cap}ms — returning partial, retrying in background`,
      )
      resolve({ ok: false, partial: true, error: `agent ${opts.name} exceeded ${cap}ms cap` })
    }, cap)
  })

  const successPromise = realPromise
    .then<AgentResult<T>>((data) => {
      if (settled) {
        // Timeout already fired and we're done. Caller already moved on; the
        // onLate tap will run from the .then() above.
        return { ok: false, partial: true, error: 'late' }
      }
      settled = true
      return { ok: true, data, partial: false }
    })
    .catch<AgentResult<T>>((err) => {
      if (settled) return { ok: false, partial: true, error: 'late' }
      settled = true
      return { ok: false, partial: true, error: (err as Error).message }
    })

  return Promise.race([successPromise, timeoutPromise])
}

/**
 * Convenience: get the data or null. Useful when the caller doesn't care about
 * the partial flag and just wants to short-circuit downstream.
 */
export function dataOrNull<T>(r: AgentResult<T>): T | null {
  return r.ok ? r.data : null
}
