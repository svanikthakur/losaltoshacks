/**
 * One-Click Launch Kit — produces 4 launch assets in a single Ollama call:
 *   1. 5 domain name suggestions
 *   2. text-based logo concept (mark + colors + fonts)
 *   3. landing page HTML (Tailwind CDN, ready to drop into a static host)
 *   4. waitlist embed snippet
 */
import { callAgentJSON } from '../services/ai.js'
import { dnaContextBlock, type DNA } from '../services/dnaContext.js'
import type { ScoutOutput } from './Scout.js'
import type { AtlasOutput } from './Atlas.js'

export interface LaunchKitOutput {
  domains: Array<{ name: string; tld: string; rationale: string }>
  logo: {
    concept: string
    palette: string[]
    fontDisplay: string
    fontBody: string
  }
  landingHtml: string
  waitlistEmbed: string
  tagline: string
}

const SYSTEM = `You are a launch designer. For a startup, generate a complete launch kit.
Return ONLY JSON with this exact shape:
{
  "domains": [{"name": string, "tld": string, "rationale": string}],
  "logo": {
    "concept": string,
    "palette": string[],
    "fontDisplay": string,
    "fontBody": string
  },
  "landingHtml": string (a complete <html> document using Tailwind CDN),
  "waitlistEmbed": string (a self-contained HTML snippet with form + script),
  "tagline": string (one punchy tagline, under 60 chars)
}

Rules for landingHtml:
- Use <script src="https://cdn.tailwindcss.com"></script> in <head>
- Dark background, single accent color from the palette
- Hero with tagline, subtitle, email capture, "Get early access" button
- Three feature cards
- Footer
- Self-contained — no external assets or fonts
- Under 4000 characters

Domains: 5 suggestions, mix of .com / .ai / .io / .so / .co. Short, memorable.`

export async function runLaunchKit(
  idea: string,
  scout: ScoutOutput,
  atlas: AtlasOutput,
  dna: DNA,
): Promise<LaunchKitOutput> {
  const user = `Idea: "${idea}"
ICP: ${atlas.icp}
GTM: ${atlas.gtm}
Top competitors: ${(scout.competitors || [])
    .slice(0, 3)
    .map((c) => c.name)
    .join(', ')}${dnaContextBlock(dna)}

Generate the complete launch kit.`

  return callAgentJSON<LaunchKitOutput>(
    'pivot',
    SYSTEM + dnaContextBlock(dna),
    user,
    { temperature: 0.6, timeoutMs: 90_000, maxTokens: 4096 },
  )
}
