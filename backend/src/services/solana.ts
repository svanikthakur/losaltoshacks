/**
 * Solana on-chain demand signals.
 *
 * Pulls real, free data from public APIs (no keys required):
 *   - DeFi Llama  → protocol TVL, 7d / 30d change, category (chains='Solana')
 *   - Solana RPC  → network-level activity (tx count, epoch)
 *   - Jupiter     → token price + swap volume (free price API)
 *
 * Used by Scout to surface actual on-chain demand when the idea is crypto /
 * web3 adjacent. If the idea isn't Solana-relevant, we short-circuit so we
 * don't waste latency on calls that won't ground the brief.
 */
import axios from 'axios'

/* ───────── public types ───────── */

export interface SolanaProtocolSignal {
  kind: 'protocol'
  name: string
  category: string
  tvl: number // USD
  change1d: number | null
  change7d: number | null
  change30d: number | null
  url: string
  logo: string | null
}

export interface SolanaNetworkSignal {
  kind: 'network'
  absoluteSlot: number | null
  epoch: number | null
  transactionCount: number | null
  sampleTps: number | null
}

export type SolanaSignal = SolanaProtocolSignal | SolanaNetworkSignal

export interface SolanaSnapshot {
  relevant: boolean // whether idea is Solana/web3 adjacent
  queryTerms: string[] // tokens we matched on
  protocols: SolanaProtocolSignal[] // top 5 matched protocols by TVL
  network: SolanaNetworkSignal | null
  summary: string // 1-sentence human summary
}

/* ───────── relevance gate ───────── */

const WEB3_KEYWORDS = [
  'solana',
  'crypto',
  'web3',
  'defi',
  'nft',
  'blockchain',
  'onchain',
  'on-chain',
  'token',
  'wallet',
  'staking',
  'dao',
  'dapp',
  'dex',
  'liquidity',
  'memecoin',
  'yield',
  'swap',
  'bridge',
  'rollup',
  'chain',
  'ledger',
  'smart contract',
  'sol ',
  ' sol',
]

function isSolanaRelevant(idea: string): { relevant: boolean; terms: string[] } {
  const lower = ` ${idea.toLowerCase()} `
  const matched: string[] = []
  for (const k of WEB3_KEYWORDS) {
    if (lower.includes(k)) matched.push(k.trim())
  }
  return { relevant: matched.length > 0, terms: matched }
}

/* ───────── DeFi Llama ───────── */

interface LlamaProtocol {
  name: string
  category?: string
  tvl?: number
  chainTvls?: Record<string, number>
  chains?: string[]
  change_1d?: number
  change_7d?: number
  change_30d?: number
  url?: string
  logo?: string
}

async function fetchLlamaProtocols(): Promise<LlamaProtocol[]> {
  try {
    const res = await axios.get<LlamaProtocol[]>('https://api.llama.fi/protocols', {
      timeout: 8000,
      headers: { 'user-agent': 'Venture AI/1.0' },
    })
    if (!Array.isArray(res.data)) return []
    return res.data
  } catch (err) {
    console.warn('[solana] defi llama fetch failed:', (err as Error).message)
    return []
  }
}

/** Score a protocol against the idea for relevance. */
function scoreProtocol(p: LlamaProtocol, idea: string): number {
  const haystack = `${p.name || ''} ${p.category || ''}`.toLowerCase()
  const tokens = idea
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4)
  let hits = 0
  for (const t of tokens) if (haystack.includes(t)) hits++
  return hits
}

async function topSolanaProtocols(idea: string, limit = 5): Promise<SolanaProtocolSignal[]> {
  const all = await fetchLlamaProtocols()
  if (all.length === 0) return []

  // Only protocols that have any TVL on Solana
  const onSolana = all.filter((p) => {
    const chains = Array.isArray(p.chains) ? p.chains : []
    const chainTvls = p.chainTvls || {}
    return chains.includes('Solana') || chainTvls['Solana'] !== undefined
  })

  // First pick: highest idea-relevance, then TVL tiebreak
  const scored = onSolana
    .map((p) => ({ p, score: scoreProtocol(p, idea), tvl: p.chainTvls?.['Solana'] ?? p.tvl ?? 0 }))
    .filter((x) => x.tvl > 0)

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.tvl - a.tvl
  })

  return scored.slice(0, limit).map<SolanaProtocolSignal>(({ p, tvl }) => ({
    kind: 'protocol',
    name: p.name,
    category: p.category || 'unknown',
    tvl,
    change1d: p.change_1d ?? null,
    change7d: p.change_7d ?? null,
    change30d: p.change_30d ?? null,
    url: p.url || '',
    logo: p.logo || null,
  }))
}

/* ───────── Solana RPC ───────── */

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

async function rpcCall<T>(method: string, params: unknown[] = []): Promise<T | null> {
  try {
    const res = await axios.post(
      RPC_URL,
      { jsonrpc: '2.0', id: 1, method, params },
      { timeout: 6000, headers: { 'content-type': 'application/json' } },
    )
    const body = res.data as { result?: T; error?: unknown }
    if (body.error) return null
    return (body.result ?? null) as T | null
  } catch (err) {
    console.warn(`[solana] rpc ${method} failed:`, (err as Error).message)
    return null
  }
}

async function fetchNetworkSnapshot(): Promise<SolanaNetworkSignal | null> {
  try {
    // Grab a handful of lightweight stats in parallel
    const [slot, epochInfo, perfSamples, txCount] = await Promise.all([
      rpcCall<number>('getSlot'),
      rpcCall<{ epoch: number }>('getEpochInfo'),
      rpcCall<Array<{ numTransactions: number; samplePeriodSecs: number }>>('getRecentPerformanceSamples', [1]),
      rpcCall<number>('getTransactionCount'),
    ])

    let sampleTps: number | null = null
    if (Array.isArray(perfSamples) && perfSamples[0]) {
      const s = perfSamples[0]
      if (s.samplePeriodSecs > 0) sampleTps = Math.round(s.numTransactions / s.samplePeriodSecs)
    }

    return {
      kind: 'network',
      absoluteSlot: slot ?? null,
      epoch: epochInfo?.epoch ?? null,
      transactionCount: txCount ?? null,
      sampleTps,
    }
  } catch (err) {
    console.warn('[solana] network snapshot failed:', (err as Error).message)
    return null
  }
}

/* ───────── public entrypoint ───────── */

export async function getOnchainSignals(idea: string): Promise<SolanaSnapshot> {
  const { relevant, terms } = isSolanaRelevant(idea)
  if (!relevant) {
    return {
      relevant: false,
      queryTerms: [],
      protocols: [],
      network: null,
      summary: 'Not a Solana/web3 adjacent idea — on-chain signals skipped.',
    }
  }

  const [protocols, network] = await Promise.all([topSolanaProtocols(idea, 5), fetchNetworkSnapshot()])

  const tvlSum = protocols.reduce((acc, p) => acc + p.tvl, 0)
  const avg7d =
    protocols.length > 0
      ? protocols.reduce((acc, p) => acc + (p.change7d ?? 0), 0) / protocols.length
      : null

  const summary = protocols.length
    ? `Matched ${protocols.length} Solana ${protocols.length === 1 ? 'protocol' : 'protocols'} worth $${formatUsd(tvlSum)} TVL, avg 7d ${avg7d != null ? (avg7d >= 0 ? '+' : '') + avg7d.toFixed(1) + '%' : 'flat'}.${network?.sampleTps ? ` Network running ~${network.sampleTps} TPS.` : ''}`
    : `No direct DeFi Llama protocol matches, but idea mentions web3 terms: ${terms.slice(0, 3).join(', ')}.`

  return {
    relevant: true,
    queryTerms: terms,
    protocols,
    network,
    summary,
  }
}

function formatUsd(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(0)
}
