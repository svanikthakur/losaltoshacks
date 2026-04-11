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
}

/** One-shot completion. */
export async function callAgent(
  role: AgentRole,
  systemPrompt: string,
  userMessage: string,
  opts: CallOpts = {},
): Promise<string> {
  const model = await pickModel(role)
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 2048,
    ...(opts.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
  })
  return res.choices[0]?.message?.content ?? ''
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
 * Call + parse JSON, with one retry on malformed output.
 * Always uses Ollama's forced JSON mode on the first attempt.
 */
export async function callAgentJSON<T>(
  role: AgentRole,
  systemPrompt: string,
  userMessage: string,
  opts: CallOpts = {},
): Promise<T> {
  // Attempt 1 — forced JSON mode
  try {
    const raw = await callAgent(role, systemPrompt, userMessage, { ...opts, jsonMode: true })
    return extractJSON<T>(raw)
  } catch (e1) {
    console.warn(`[ai:${role}] first attempt failed: ${(e1 as Error).message.slice(0, 200)}`)
  }

  // Attempt 2 — stricter system prompt, lower temperature, still json mode
  const stricter =
    systemPrompt +
    '\n\nCRITICAL: Your entire response must be a single valid JSON object. ' +
    'No markdown fences. No commentary. No trailing text. JSON only.'
  try {
    const raw = await callAgent(role, stricter, userMessage, {
      ...opts,
      jsonMode: true,
      temperature: 0.1,
    })
    return extractJSON<T>(raw)
  } catch (e2) {
    console.error(`[ai:${role}] retry also failed: ${(e2 as Error).message.slice(0, 300)}`)
    throw e2
  }
}
