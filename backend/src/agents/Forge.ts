/**
 * Forge — technical blueprint + MVP scaffold agent.
 *
 * Phase 1: OpenAI generates a deep technical blueprint:
 *   - structured tech stack (frontend/backend/db/ai/hosting + justification)
 *   - MVP features with user stories + complexity + estimate
 *   - cut list (what NOT to build)
 *   - architecture (modules + data flow + API endpoints)
 *   - 12-week build roadmap
 *   - buildability score
 *
 * Phase 2: Real GitHub repo (when token has scopes) OR downloadable .zip scaffold
 * built from the REAL blueprint above. No dummy data anywhere.
 */
import JSZip from 'jszip'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { callAgentJSON } from '../services/ai.js'
import { createRepo, putFile, slugify } from '../services/github.js'
import { dnaContextBlock, type DNA } from '../services/dnaContext.js'
import type { ScoutOutput } from './Scout.js'
import type { AtlasOutput } from './Atlas.js'

export interface TechStackEntry {
  layer: 'frontend' | 'backend' | 'database' | 'ai' | 'hosting'
  technology: string
  justification: string
}

export interface MvpFeature {
  name: string
  userStory: string // "As a <role>, I want <goal> so that <reason>"
  complexity: 'low' | 'medium' | 'high'
  estimateDays: number
}

export interface ArchitectureModule {
  name: string
  responsibility: string
}

export interface ArchitectureEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  description: string
}

export interface RoadmapPhase {
  weeks: string // e.g. "Weeks 1-3"
  goal: string
  deliverables: string[]
}

export interface ForgeBlueprint {
  techStack: TechStackEntry[]
  mvpFeatures: MvpFeature[]
  cutList: string[]
  architecture: {
    modules: ArchitectureModule[]
    dataFlow: string
    apiEndpoints: ArchitectureEndpoint[]
  }
  buildRoadmap: RoadmapPhase[]
  buildabilityScore: number // 0-100
  shortPitch: string
}

export interface ForgeOutput extends ForgeBlueprint {
  repoUrl: string | null
  zipUrl: string | null
  error?: string
  fixUrl?: string
}

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'forge')
const PUBLIC_BASE = process.env.STORAGE_PUBLIC_BASE || 'http://localhost:4000/storage/forge'

/* ============================================================
   Phase 1 — generate blueprint via OpenAI
   ============================================================ */
const BLUEPRINT_SYSTEM = `You are Forge, a senior staff engineer + product architect.

Given a startup idea + market context (Scout brief + Atlas plan), return a deep technical blueprint.

Return ONLY valid JSON:
{
  "techStack": [
    {
      "layer": "frontend" | "backend" | "database" | "ai" | "hosting",
      "technology": string (e.g. "Next.js 15"),
      "justification": string (one sentence — why this for this idea)
    }
  ] (exactly 5 entries — one per layer),

  "mvpFeatures": [
    {
      "name": string (short feature name),
      "userStory": string ("As a <role>, I want <goal> so that <reason>"),
      "complexity": "low" | "medium" | "high",
      "estimateDays": number
    }
  ] (5-7 features),

  "cutList": string[] (4-6 SPECIFIC features being deferred from v1),

  "architecture": {
    "modules": [
      { "name": string, "responsibility": string }
    ] (4-6 modules using kebab-case names),
    "dataFlow": string (one paragraph describing how data moves through the system),
    "apiEndpoints": [
      { "method": "GET"|"POST"|"PUT"|"PATCH"|"DELETE", "path": string, "description": string }
    ] (5-8 core endpoints)
  },

  "buildRoadmap": [
    {
      "weeks": string (e.g. "Weeks 1-3"),
      "goal": string,
      "deliverables": string[]
    }
  ] (exactly 4 phases summing to ~12 weeks),

  "buildabilityScore": number (0-100 — how easily a solo founder can ship this),
  "shortPitch": string (one sentence elevator pitch under 120 chars)
}

Rules:
- Modern, boring, ship-in-12-weeks technologies. No bleeding edge.
- User stories follow the canonical "As a <role>, I want <goal> so that <reason>" pattern.
- Cut list must be SPECIFIC features being deferred, not vague categories.
- Roadmap phases must sum to ~12 weeks total.
- Zero spelling mistakes.`

async function generateBlueprint(
  idea: string,
  scout: ScoutOutput | null,
  atlas: AtlasOutput,
  dna?: DNA,
): Promise<ForgeBlueprint> {
  const user = `Idea: "${idea}"

Atlas plan (TAM ${atlas.tam}, opportunity ${atlas.opportunityScore}/100):
${JSON.stringify(atlas, null, 2)}

${
  scout
    ? `Scout brief (competitors: ${scout.competitors?.map((c) => c.name).join(', ')}):
${JSON.stringify(scout, null, 2)}`
    : '(Scout brief not yet available — design from idea + Atlas alone.)'
}${dna ? dnaContextBlock(dna) : ''}

Produce the Forge technical blueprint. If the operator DNA shows limited hours/week
or missing technical skills, bias the stack toward managed services and the cutList
toward features that require deep engineering.`

  return callAgentJSON<ForgeBlueprint>('forge', BLUEPRINT_SYSTEM + (dna ? dnaContextBlock(dna) : ''), user, {
    temperature: 0.3,
    maxTokens: 4000,
    timeoutMs: 90_000,
  })
}

/* ============================================================
   Public entry — blueprint + repo/zip
   ============================================================ */
export async function runForge(
  idea: string,
  scout: ScoutOutput | null,
  atlas: AtlasOutput,
  dna?: DNA,
): Promise<ForgeOutput> {
  const blueprint = await generateBlueprint(idea, scout, atlas, dna)

  const slug = slugify(idea)
  const description = (blueprint.shortPitch || idea).slice(0, 160)

  // Path A — try real GitHub repo
  if (process.env.GITHUB_TOKEN) {
    try {
      const repo = await createRepo({ name: slug, description })
      try {
        const commit = (p: string, c: string, m: string) =>
          putFile({
            owner: repo.owner,
            repo: repo.repo,
            path: p,
            content: c,
            message: m,
            branch: repo.defaultBranch,
          })

        // Commit core docs + config sequentially (Contents API has per-file rate limits)
        await commit('README.md', buildReadme(idea, blueprint, repo.owner, repo.repo), 'forge: initial README')
        await commit('BLUEPRINT.md', buildBlueprintDoc(blueprint), 'forge: blueprint document')
        await commit('package.json', buildPackageJson(slug, blueprint), 'forge: package.json')
        await commit('.gitignore', 'node_modules\ndist\n.env\n.DS_Store\n*.log\n', 'forge: gitignore')
        await commit('.env.example', '# Add your real env vars here\nPORT=3000\n', 'forge: env example')

        // Commit one stub per architecture module so the repo has real code structure
        for (const m of blueprint.architecture.modules) {
          const safe = m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          await commit(
            `src/${safe}/index.ts`,
            `// ${m.name}\n// ${m.responsibility}\n// Generated by Forge.\n\nexport function ${camelCase(safe)}() {\n  // TODO: implement\n}\n`,
            `forge: ${m.name} module stub`,
          )
        }
      } catch (err) {
        console.warn(`[forge] file commit failed: ${(err as Error).message}`)
      }
      return { ...blueprint, repoUrl: repo.htmlUrl, zipUrl: null }
    } catch (err) {
      console.warn(`[forge] createRepo failed, falling back to ZIP: ${(err as Error).message}`)
    }
  }

  // Path B — real .zip scaffold
  await mkdir(STORAGE_DIR, { recursive: true })
  const zip = new JSZip()
  zip.file('README.md', buildReadme(idea, blueprint, 'agentconnect', slug))
  zip.file('BLUEPRINT.md', buildBlueprintDoc(blueprint))
  zip.file('package.json', buildPackageJson(slug, blueprint))
  zip.file('.gitignore', 'node_modules\ndist\n.env\n.DS_Store\n*.log\n')
  zip.file('.env.example', '# Add your real env vars here\nPORT=3000\n')
  for (const m of blueprint.architecture.modules) {
    const safeName = m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    zip.file(
      `src/${safeName}/index.ts`,
      `// ${m.name}\n// ${m.responsibility}\n// Generated by Forge.\n\nexport function ${camelCase(safeName)}() {\n  // TODO: implement\n}\n`,
    )
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer' })
  const zipPath = path.join(STORAGE_DIR, `${slug}.zip`)
  await writeFile(zipPath, buffer)

  return {
    ...blueprint,
    repoUrl: null,
    zipUrl: `${PUBLIC_BASE}/${slug}.zip`,
    error: process.env.GITHUB_TOKEN
      ? 'GitHub token cannot create repositories (needs Administration: Read+Write or `repo` scope). Scaffold delivered as a downloadable .zip instead.'
      : 'GITHUB_TOKEN not set. Scaffold delivered as a downloadable .zip instead.',
    fixUrl: 'https://github.com/settings/personal-access-tokens',
  }
}

/* ============================================================
   Scaffold templates — built from REAL blueprint
   ============================================================ */
function buildReadme(idea: string, b: ForgeBlueprint, owner: string, repo: string): string {
  return `# ${repo}

> ${b.shortPitch}

## The idea

${idea}

## Tech stack

${b.techStack.map((t) => `- **${t.layer}**: \`${t.technology}\` — ${t.justification}`).join('\n')}

## MVP features

${b.mvpFeatures.map((f) => `- **${f.name}** (${f.complexity}, ~${f.estimateDays}d): ${f.userStory}`).join('\n')}

## Cut from v1

${b.cutList.map((c) => `- ${c}`).join('\n')}

## Build roadmap

${b.buildRoadmap.map((p) => `### ${p.weeks} — ${p.goal}\n\n${p.deliverables.map((d) => `- ${d}`).join('\n')}`).join('\n\n')}

## Buildability

${b.buildabilityScore} / 100

---

_Scaffolded by [AgentConnect](https://github.com/${owner}/${repo})._
`
}

function buildBlueprintDoc(b: ForgeBlueprint): string {
  return `# Architecture Blueprint

## Data flow

${b.architecture.dataFlow}

## Modules

${b.architecture.modules.map((m) => `### ${m.name}\n\n${m.responsibility}`).join('\n\n')}

## API endpoints

${b.architecture.apiEndpoints.map((e) => `- \`${e.method} ${e.path}\` — ${e.description}`).join('\n')}
`
}

function buildPackageJson(slug: string, b: ForgeBlueprint): string {
  return JSON.stringify(
    {
      name: slug,
      version: '0.1.0',
      private: true,
      description: b.shortPitch,
      scripts: { dev: 'echo "TODO: dev script"', build: 'echo "TODO: build script"' },
      keywords: b.techStack.map((t) => t.technology),
    },
    null,
    2,
  )
}

function camelCase(s: string): string {
  return s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
}
