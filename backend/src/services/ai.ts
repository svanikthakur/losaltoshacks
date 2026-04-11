/**
 * Central Ollama client. Every agent goes through here.
 * Ollama exposes an OpenAI-compatible endpoint at :11434/v1 — we use the `openai` SDK.
 *
 * Notes on JSON reliability:
 *  - We pass `response_format: { type: 'json_object' }` to force grammar-constrained JSON output.
 *    Ollama respects this on the llama/mistral/deepseek family.
 *  - extractJSON() is a tolerant fallback — strips markdown fences, walks braces, repairs
 *    trailing commas and smart quotes, parses what it finds.
 *  - callAgentJSON() retries once with a stricter prompt if the first parse fails,
 *    and logs the raw response so you can eyeball failures during dev.
 */
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
  apiKey: 'ollama',
})

export type AgentRole = 'scout' | 'atlas' | 'forge' | 'deck' | 'connect' | 'pivot' | 'simulator'

const PREFERRED_MODEL: Record<AgentRole, string> = {
  scout: 'llama3.1',
  atlas: 'llama3.1',
  forge: 'deepseek-coder',
  deck: 'llama3.1',
  connect: 'mistral',
  pivot: 'mistral',
  simulator: 'mistral',
}

const FALLBACK_MODEL = 'llama3.1'

let availableModels: Set<string> | null = null
async function getAvailableModels(): Promise<Set<string>> {
  if (availableModels) return availableModels
  try {
    const base = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1').replace(/\/v1$/, '')
    const res = await fetch(`${base}/api/tags`)
    const json = (await res.json()) as { models?: Array<{ name: string }> }
    availableModels = new Set((json.models || []).map((m) => m.name.split(':')[0]))
  } catch {
    availableModels = new Set<string>()
  }
  return availableModels
}

async function pickModel(role: AgentRole): Promise<string> {
  const want = PREFERRED_MODEL[role]
  const have = await getAvailableModels()
  if (have.has(want)) return want
  if (have.has(FALLBACK_MODEL)) return FALLBACK_MODEL
  return want
}

export interface CallOpts {
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
  /** Hard ceiling in ms. Defaults to 45000 (45s). */
  timeoutMs?: number
}

const DEFAULT_TIMEOUT = 45_000

/** Wrap a promise in a timeout. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    p.then((v) => {
      clearTimeout(timer)
      resolve(v)
    }).catch((err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

/** One-shot completion with a hard timeout. */
export async function callAgent(
  role: AgentRole,
  systemPrompt: string,
  userMessage: string,
  opts: CallOpts = {},
): Promise<string> {
  const model = await pickModel(role)
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT
  const started = Date.now()
  console.log(`[ai:${role}] → ${model}  (timeout ${timeout}ms)`)
  try {
    const res = await withTimeout(
      client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 2048,
        ...(opts.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
      }),
      timeout,
      `[ai:${role}]`,
    )
    const out = res.choices[0]?.message?.content ?? ''
    console.log(`[ai:${role}] ← ${out.length} chars in ${Date.now() - started}ms`)
    return out
  } catch (err) {
    console.warn(`[ai:${role}] ✗ ${(err as Error).message}`)
    throw err
  }
}

/** Streaming version. */
export async function* callAgentStream(
  role: AgentRole,
  systemPrompt: string,
  userMessage: string,
): AsyncGenerator<string> {
  const model = await pickModel(role)
  const stream = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    stream: true,
    temperature: 0.3,
  })
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) yield delta
  }
}

/* ============================================================
   JSON EXTRACTION — tolerant walker with repair
   ============================================================ */

/**
 * Strip markdown code fences and any leading/trailing prose.
 * Walk the string to find the first balanced `{…}` or `[…]`.
 */
function findJsonBlock(raw: string): string | null {
  // Strip ```json ... ``` or ``` ... ``` fences first
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fence ? fence[1] : raw

  // Find first `{` or `[`
  const start = body.search(/[\{\[]/)
  if (start < 0) return null

  // Walk chars, tracking string state + escape, counting depth
  let depth = 0
  let inString = false
  let escape = false
  const open = body[start]
  const close = open === '{' ? '}' : ']'

  for (let i = start; i < body.length; i++) {
    const c = body[i]
    if (escape) {
      escape = false
      continue
    }
    if (c === '\\') {
      escape = true
      continue
    }
    if (c === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (c === open) depth++
    else if (c === close) {
      depth--
      if (depth === 0) return body.slice(start, i + 1)
    }
  }
  return null
}

function repair(json: string): string {
  return json
    // smart quotes → straight
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    // trailing commas
    .replace(/,(\s*[}\]])/g, '$1')
    // stray BOMs
    .replace(/^\uFEFF/, '')
}

export function extractJSON<T>(raw: string): T {
  const block = findJsonBlock(raw) || raw.trim()
  try {
    return JSON.parse(block) as T
  } catch {
    try {
      return JSON.parse(repair(block)) as T
    } catch (e) {
      throw new Error(
        `AI response contained no parseable JSON.\n` +
          `Error: ${(e as Error).message}\n` +
          `Raw (first 500 chars): ${raw.slice(0, 500)}`,
      )
    }
  }
}

/**
 * Call + parse JSON, with TWO retries on malformed output.
 * Attempt 1: default temp + json mode.
 * Attempt 2: lower temp + stricter system prompt + json mode.
 * Attempt 3: minimum temp + even stricter + json mode + example-driven.
 *
 * Every attempt has a hard timeout (from opts.timeoutMs or the default 45s).
 */
export async function callAgentJSON<T>(
  role: AgentRole,
  systemPrompt: string,
  userMessage: string,
  opts: CallOpts = {},
): Promise<T> {
  const attempts: Array<{ label: string; system: string; temperature: number }> = [
    { label: 'attempt 1', system: systemPrompt, temperature: opts.temperature ?? 0.3 },
    {
      label: 'attempt 2 (stricter)',
      system:
        systemPrompt +
        '\n\nCRITICAL: Your entire response must be a single valid JSON object. ' +
        'No markdown fences. No commentary. No trailing text. JSON only.',
      temperature: 0.15,
    },
    {
      label: 'attempt 3 (minimal temp)',
      system:
        systemPrompt +
        '\n\nFINAL WARNING: Emit only a JSON object. Start your response with `{` and end with `}`. ' +
        'Every string must be properly quoted. Commas only between elements. No trailing commas.',
      temperature: 0.05,
    },
  ]

  let lastErr: Error | null = null
  for (const a of attempts) {
    try {
      const raw = await callAgent(role, a.system, userMessage, {
        ...opts,
        jsonMode: true,
        temperature: a.temperature,
      })
      const parsed = extractJSON<T>(raw)
      if (a.label !== 'attempt 1') console.log(`[ai:${role}] recovered on ${a.label}`)
      return parsed
    } catch (err) {
      lastErr = err as Error
      console.warn(`[ai:${role}] ${a.label} failed: ${(err as Error).message.slice(0, 180)}`)
    }
  }
  throw lastErr ?? new Error(`[ai:${role}] all attempts failed`)
}
