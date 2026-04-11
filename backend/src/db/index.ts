/**
 * Database entry point.
 *  - If SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set AND the preflight check
 *    confirms the schema is in place, exports the real Supabase adapter.
 *  - Otherwise falls back to the in-memory store.
 *
 * Both adapters share the exact same async method surface — routes and the
 * pipeline never know which one they're talking to.
 */
import { memoryStore, type DB } from './memory.js'

const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

let _db: DB = memoryStore
let _mode: 'memory' | 'supabase' = 'memory'

export async function initDB(): Promise<'memory' | 'supabase'> {
  if (!hasSupabase) {
    console.log('[db] SUPABASE_URL unset — using in-memory store')
    return 'memory'
  }
  try {
    const { supabaseStore, supabasePreflight } = await import('./supabase.js')
    const pre = await supabasePreflight()
    if (!pre.ok) {
      console.warn(`[db] Supabase schema check failed: ${pre.reason}`)
      console.warn('[db] → Go to https://supabase.com/dashboard/project/<ref>/sql/new')
      console.warn('[db] → Paste backend/src/db/schema.sql and click Run')
      console.warn('[db] → Falling back to in-memory store')
      return 'memory'
    }
    _db = supabaseStore
    _mode = 'supabase'
    console.log('[db] Supabase adapter online')
    return 'supabase'
  } catch (err) {
    console.warn(`[db] Supabase init failed: ${(err as Error).message} — using memory`)
    return 'memory'
  }
}

export const db: DB = new Proxy(memoryStore, {
  get(_target, prop) {
    return (_db as any)[prop]
  },
}) as DB

export function dbMode(): 'memory' | 'supabase' {
  return _mode
}
