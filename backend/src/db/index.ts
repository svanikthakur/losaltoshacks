/**
 * Database entry point. Exports a single `db` object that either:
 *  - wraps a real Supabase client (when SUPABASE_URL is set), or
 *  - delegates to the in-memory store (local dev / demos).
 *
 * Same method surface in both cases — routes and the pipeline never know the difference.
 */
import { memoryStore } from './memory.js'

const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

if (hasSupabase) {
  // eslint-disable-next-line no-console
  console.log('[db] Supabase URL detected — (supabase adapter stub; falling back to memory for now)')
}

// TODO: when Supabase is provisioned, implement a thin adapter over @supabase/supabase-js
// that exposes the same surface as memoryStore. Phase 1 runs against the memory store.

export const db = memoryStore
export type DB = typeof db
