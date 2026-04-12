/**
 * Server-side hash cache for full pipeline outputs.
 *
 * Two lookup paths:
 *  1. Exact key (sha256 of normalized idea + dna signature) — instant.
 *  2. Fuzzy match (Jaccard token-set similarity ≥ 0.85) within the same DNA bucket.
 *
 * 24h TTL.
 */
import { createHash } from 'crypto'

const TTL_MS = 24 * 60 * 60 * 1000
const FUZZY_THRESHOLD = 0.85

interface CachedRun {
  expiresAt: number
  idea: string // original idea text — used for fuzzy matching
  dnaSig: string
  outputs: {
    scout: unknown
    atlas: unknown
    forge: unknown
    deck: unknown
    connect: unknown
    validationScore: number
  }
}

const store = new Map<string, CachedRun>()

export function cacheKey(idea: string, dnaSignature: string): string {
  const norm = idea.trim().toLowerCase().replace(/\s+/g, ' ')
  return createHash('sha256').update(`${norm}::${dnaSignature}`).digest('hex')
}

/** Exact-key lookup. */
export function getCached(key: string): CachedRun['outputs'] | null {
  const hit = store.get(key)
  if (!hit) return null
  if (hit.expiresAt < Date.now()) {
    store.delete(key)
    return null
  }
  return hit.outputs
}

/**
 * Fuzzy lookup. Iterates entries with the same DNA signature, computes
 * Jaccard similarity on tokenized ideas, returns the first hit above threshold.
 */
export function findFuzzyMatch(
  idea: string,
  dnaSignature: string,
  threshold = FUZZY_THRESHOLD,
): CachedRun['outputs'] | null {
  const targetTokens = tokenize(idea)
  if (targetTokens.size === 0) return null

  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt < Date.now()) {
      store.delete(key)
      continue
    }
    if (entry.dnaSig !== dnaSignature) continue
    const sim = jaccard(targetTokens, tokenize(entry.idea))
    if (sim >= threshold) return entry.outputs
  }
  return null
}

export function setCached(key: string, idea: string, dnaSignature: string, outputs: CachedRun['outputs']): void {
  store.set(key, {
    expiresAt: Date.now() + TTL_MS,
    idea,
    dnaSig: dnaSignature,
    outputs,
  })
}

export function clearCache(): void {
  store.clear()
}

/* ============================================================
   Helpers
   ============================================================ */
function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  )
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const t of a) if (b.has(t)) intersection++
  const union = a.size + b.size - intersection
  return intersection / union
}
