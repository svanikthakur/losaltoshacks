/**
 * Source validator — filters the raw Serper results + any model-generated
 * source list down to sources we trust enough to surface in a report.
 *
 * A "good" source is:
 *   1. A real URL on a domain we trust (or at least don't blocklist).
 *   2. Has a non-trivial snippet and title (no empty aggregator pages).
 *   3. Is not from a low-signal domain (pinterest, blogspot, spammy hubs).
 *   4. Has a topical match against the idea (at least one meaningful token).
 *
 * The validator is synchronous — no HTTP probes — so it runs in microseconds
 * and doesn't stretch the pipeline's 15s agent budget.
 */

export interface CandidateSource {
  title: string
  url: string
  snippet: string
}

export interface ValidatedSource extends CandidateSource {
  domain: string
  trustScore: number // 0-100
}

/* ───────── trust lists ───────── */

// Curated: high editorial standards, domain authority, real reporting.
const ALLOWED_DOMAINS: ReadonlySet<string> = new Set([
  // Tier 1 journalism / research
  'techcrunch.com',
  'theinformation.com',
  'bloomberg.com',
  'reuters.com',
  'wsj.com',
  'nytimes.com',
  'forbes.com',
  'ft.com',
  'economist.com',
  'axios.com',
  'theverge.com',
  'wired.com',
  'arstechnica.com',
  'protocol.com',
  'sifted.eu',
  'techeu.com',
  // Startup / investor data
  'crunchbase.com',
  'pitchbook.com',
  'cbinsights.com',
  'ycombinator.com',
  'news.ycombinator.com',
  'producthunt.com',
  'angel.co',
  'wellfound.com',
  // Industry research
  'gartner.com',
  'statista.com',
  'mckinsey.com',
  'bain.com',
  'forrester.com',
  'idc.com',
  // Major VC blogs
  'a16z.com',
  'sequoiacap.com',
  'usv.com',
  'firstround.com',
  'initialized.com',
  'bvp.com',
  'greylock.com',
  // Tech / dev
  'github.com',
  'stackoverflow.com',
  'dev.to',
])

// Domains we refuse outright — low signal or outright spam.
const BLOCKED_DOMAINS: ReadonlySet<string> = new Set([
  'pinterest.com',
  'pinterest.co.uk',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'twitter.com',
  'x.com', // noisy without full API
  'youtube.com',
  'vimeo.com',
  'quora.com',
  'answers.com',
  'ehow.com',
  'wikihow.com',
  'slideshare.net',
  'scribd.com',
  'wattpad.com',
  'academia.edu', // often paywalled preprints
])

// Hostname substrings that flag SEO spam / auto-generated farms.
const SPAM_SUBSTRINGS: readonly string[] = [
  'blogspot.',
  'wordpress.com',
  'medium.com/@', // personal medium pages — allow top-level medium.com
  'tumblr.com',
  'siteglimpse',
  'domainstats',
  'whoisxmlapi',
  'similarweb',
  'semrush',
  'zoominfo',
]

// Title/snippet patterns that scream SEO farm or listicle junk.
const JUNK_TITLE_PATTERNS: readonly RegExp[] = [
  /^\s*home\s*[-—|]/i,
  /buy\s+now/i,
  /\bcasino\b/i,
  /\bgambling\b/i,
  /\bcrypto\s+giveaway\b/i,
]

/* ───────── helpers ───────── */

function hostname(url: string): string | null {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

function isTldTrusted(host: string): boolean {
  return host.endsWith('.gov') || host.endsWith('.edu') || host.endsWith('.mil')
}

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 4),
  )
}

function topicalOverlap(idea: string, title: string, snippet: string): number {
  const ideaTokens = tokenize(idea)
  if (ideaTokens.size === 0) return 1 // degenerate idea → accept all
  const text = tokenize(`${title} ${snippet}`)
  let hits = 0
  for (const t of ideaTokens) if (text.has(t)) hits++
  return hits / ideaTokens.size
}

/* ───────── scorer ───────── */

export function scoreSource(idea: string, src: CandidateSource): ValidatedSource | null {
  const host = hostname(src.url)
  if (!host) return null

  // Hard block: denylist
  if (BLOCKED_DOMAINS.has(host)) return null
  for (const sub of SPAM_SUBSTRINGS) {
    if (host.includes(sub) || src.url.toLowerCase().includes(sub)) return null
  }

  // Hard block: title/snippet empty or too short
  const title = (src.title || '').trim()
  const snippet = (src.snippet || '').trim()
  if (title.length < 10) return null
  if (snippet.length < 25) return null

  // Junk title patterns
  for (const re of JUNK_TITLE_PATTERNS) if (re.test(title)) return null

  // Topical overlap — at least 1 in 5 meaningful tokens must match
  const overlap = topicalOverlap(idea, title, snippet)
  if (overlap < 0.2) return null

  // Score
  let trust = 40
  if (ALLOWED_DOMAINS.has(host)) trust += 40
  if (isTldTrusted(host)) trust += 30
  if (snippet.length >= 80) trust += 10
  trust += Math.round(overlap * 20)
  trust = Math.max(0, Math.min(100, trust))

  return { ...src, domain: host, trustScore: trust }
}

/**
 * Validate + rank a list of candidate sources. Deduped by domain. Only the
 * highest-scoring entries survive, sorted by trust.
 *
 * @param idea      the founder's raw idea text
 * @param candidates raw sources (from Serper or model output)
 * @param limit     max number of sources to return
 * @param minTrust  minimum trust score required (default 50)
 */
export function validateSources(
  idea: string,
  candidates: CandidateSource[],
  limit = 6,
  minTrust = 50,
): ValidatedSource[] {
  const scored: ValidatedSource[] = []
  const seenDomains = new Set<string>()

  for (const c of candidates) {
    const v = scoreSource(idea, c)
    if (!v) continue
    if (v.trustScore < minTrust) continue
    if (seenDomains.has(v.domain)) continue
    seenDomains.add(v.domain)
    scored.push(v)
  }

  scored.sort((a, b) => b.trustScore - a.trustScore)
  return scored.slice(0, limit)
}
