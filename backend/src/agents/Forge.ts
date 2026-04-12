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
import { deployLandingPage } from '../services/vercel.js'
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

        const withFe = hasFrontend(blueprint)
        const serverDir = withFe ? 'src/server' : 'src'

        // Commit entry point
        await commit(`${serverDir}/index.ts`, buildEntryPoint(blueprint), 'forge: entry point')

        // Commit one module per architecture module with real starter code
        for (const m of blueprint.architecture.modules) {
          const safe = m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          await commit(
            `${serverDir}/${safe}/index.ts`,
            buildModuleFile(m, blueprint),
            `forge: ${m.name} module`,
          )
        }

        // Commit tsconfig
        await commit('tsconfig.json', buildTsConfig(), 'forge: tsconfig')

        // Commit frontend files if blueprint includes a frontend
        if (withFe) {
          await commit('index.html', buildIndexHtml(blueprint), 'forge: index.html')
          await commit('src/main.tsx', buildMainTsx(), 'forge: main.tsx')
          await commit('src/App.tsx', buildAppTsx(blueprint), 'forge: App.tsx')
          await commit('vite.config.ts', buildViteConfig(), 'forge: vite config')
        }
      } catch (err) {
        console.warn(`[forge] file commit failed: ${(err as Error).message}`)
      }
      return { ...blueprint, repoUrl: repo.htmlUrl, zipUrl: null }
    } catch (err) {
      console.warn(`[forge] createRepo failed, falling back to ZIP: ${(err as Error).message}`)
    }
  }

  // Path B — build a polished landing page from blueprint data (no extra API call)
  let appUrl: string | null = null
  const startupName = blueprint.shortPitch?.split(/[.!,]/)[ 0] || idea.slice(0, 40)
  const features = blueprint.mvpFeatures.slice(0, 6)
  const stack = blueprint.techStack.map((t) => typeof t === 'string' ? t : t.technology)

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${slug}</title><script src="https://cdn.tailwindcss.com"></script>
<style>*{scroll-behavior:smooth}body{font-family:system-ui,sans-serif}</style>
</head><body class="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white min-h-screen">
<nav class="fixed w-full top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-white/5">
<div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
<span class="text-lg font-bold tracking-tight">${slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
<div class="flex gap-6 text-sm text-slate-400">
<a href="#features" class="hover:text-white transition">Features</a>
<a href="#stack" class="hover:text-white transition">Stack</a>
<a href="#waitlist" class="hover:text-white transition">Get Access</a>
</div></div></nav>
<section class="pt-32 pb-20 px-6"><div class="max-w-4xl mx-auto text-center">
<div class="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-8">Buildability ${blueprint.buildabilityScore}/100</div>
<h1 class="text-5xl md:text-7xl font-bold leading-[1.1] mb-6 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">${blueprint.shortPitch || idea}</h1>
<p class="text-xl text-slate-400 max-w-2xl mx-auto mb-10">Built with ${stack.slice(0, 3).join(', ')}${stack.length > 3 ? ` and ${stack.length - 3} more` : ''}.</p>
<a href="#waitlist" class="inline-block px-8 py-4 bg-white text-slate-900 rounded-full font-semibold hover:bg-slate-100 transition shadow-lg shadow-white/10">Get Early Access</a>
</div></section>
<section id="features" class="py-20 px-6"><div class="max-w-6xl mx-auto">
<h2 class="text-3xl font-bold text-center mb-4">Core Features</h2>
<p class="text-slate-400 text-center mb-12 max-w-xl mx-auto">Everything you need, nothing you don't.</p>
<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
${features.map((f, i) => `<div class="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/30 transition group">
<div class="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-mono text-sm font-bold mb-4">${String(i + 1).padStart(2, '0')}</div>
<h3 class="text-lg font-semibold mb-2">${f.name}</h3>
<p class="text-sm text-slate-400 leading-relaxed">${f.userStory}</p>
<div class="mt-3 flex items-center gap-2"><span class="text-xs px-2 py-0.5 rounded-full ${f.complexity === 'high' ? 'bg-red-500/10 text-red-400' : f.complexity === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}">${f.complexity}</span><span class="text-xs text-slate-500">~${f.estimateDays} days</span></div>
</div>`).join('\n')}
</div></div></section>
<section id="stack" class="py-20 px-6 border-t border-white/5"><div class="max-w-4xl mx-auto text-center">
<h2 class="text-3xl font-bold mb-12">Tech Stack</h2>
<div class="flex flex-wrap justify-center gap-3">
${stack.map((t) => `<span class="px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] text-sm text-slate-300">${t}</span>`).join('\n')}
</div></div></section>
<section id="waitlist" class="py-20 px-6 border-t border-white/5"><div class="max-w-lg mx-auto text-center">
<h2 class="text-3xl font-bold mb-4">Get Early Access</h2>
<p class="text-slate-400 mb-8">Be the first to know when we launch.</p>
<form class="flex gap-2" onsubmit="event.preventDefault();this.querySelector('button').textContent='Joined!';this.querySelector('button').disabled=true">
<input type="email" placeholder="you@email.com" required class="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50">
<button type="submit" class="px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition">Join</button>
</form></div></section>
<footer class="py-8 px-6 border-t border-white/5 text-center text-xs text-slate-600">
Built with Venture AI
</footer></body></html>`

  try {
    if (process.env.VERCEL_TOKEN) {
      const deployed = await deployLandingPage(slug, html)
      appUrl = deployed.url
      console.log(`[forge] app deployed to ${appUrl}`)
    } else {
      await mkdir(STORAGE_DIR, { recursive: true })
      const htmlPath = path.join(STORAGE_DIR, `${slug}.html`)
      await writeFile(htmlPath, html)
      appUrl = `${PUBLIC_BASE}/${slug}.html`
    }
  } catch (err) {
    console.warn(`[forge] deploy failed: ${(err as Error).message}`)
  }

  return {
    ...blueprint,
    repoUrl: null,
    zipUrl: appUrl,
    error: !appUrl ? 'Deploy failed — view blueprint above for full build plan' : undefined,
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

_Scaffolded by [Venture AI](https://github.com/${owner}/${repo})._
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

function hasFrontend(b: ForgeBlueprint): boolean {
  const fe = b.techStack.find((t) => t.layer === 'frontend')?.technology?.toLowerCase() || ''
  return fe.includes('react') || fe.includes('vite') || fe.includes('next')
}

function buildPackageJson(slug: string, b: ForgeBlueprint): string {
  const fe = b.techStack.find((t) => t.layer === 'frontend')?.technology?.toLowerCase() || ''
  const be = b.techStack.find((t) => t.layer === 'backend')?.technology?.toLowerCase() || ''
  const withFe = hasFrontend(b)

  let devScript = 'npx tsx src/server/index.ts'
  let buildScript = 'npx tsc'
  const deps: Record<string, string> = {}
  const devDeps: Record<string, string> = { typescript: '^5.4.0', tsx: '^4.7.0', '@types/node': '^20.0.0' }

  if (be.includes('express')) {
    deps['express'] = '^4.21.0'
    deps['cors'] = '^2.8.5'
    deps['dotenv'] = '^16.4.0'
    devDeps['@types/express'] = '^4.17.0'
    devDeps['@types/cors'] = '^2.8.0'
  } else if (be.includes('fastify')) {
    deps['fastify'] = '^4.28.0'
    deps['dotenv'] = '^16.4.0'
  } else {
    deps['dotenv'] = '^16.4.0'
  }

  if (fe.includes('next')) {
    devScript = 'npx next dev'
    buildScript = 'npx next build'
    deps['next'] = '^14.2.0'
    deps['react'] = '^18.3.0'
    deps['react-dom'] = '^18.3.0'
  } else if (withFe) {
    deps['react'] = '^18.3.0'
    deps['react-dom'] = '^18.3.0'
    devDeps['vite'] = '^5.4.0'
    devDeps['@vitejs/plugin-react'] = '^4.3.0'
    devDeps['concurrently'] = '^9.1.0'
    devScript = 'concurrently -n api,ui "npx tsx src/server/index.ts" "npx vite"'
    buildScript = 'npx tsc && npx vite build'
  }

  if (!withFe) {
    devScript = 'npx tsx src/index.ts'
  }

  return JSON.stringify(
    {
      name: slug,
      version: '0.1.0',
      private: true,
      description: b.shortPitch,
      scripts: {
        dev: devScript,
        build: buildScript,
        start: 'node dist/index.js',
      },
      keywords: b.techStack.map((t) => t.technology),
      dependencies: deps,
      devDependencies: devDeps,
    },
    null,
    2,
  )
}

function buildEntryPoint(b: ForgeBlueprint): string {
  const be = b.techStack.find((t) => t.layer === 'backend')?.technology?.toLowerCase() || ''
  const withFe = hasFrontend(b)
  const moduleBase = withFe ? '.' : '.'
  const modules = b.architecture.modules
    .map((m) => {
      const safe = m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      return `import { ${camelCase(safe)} } from './${safe}/index.js'`
    })
    .join('\n')

  const initCalls = b.architecture.modules
    .map((m) => {
      const safe = m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      return `  console.log('  ✓ ${m.name}')\n  ${camelCase(safe)}()`
    })
    .join('\n')

  if (be.includes('express')) {
    return `import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
${modules}

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

${b.architecture.apiEndpoints
  .map(
    (e) =>
      `app.${e.method.toLowerCase()}('${e.path}', (_req, res) => {\n  res.json({ message: '${e.description}' })\n})`,
  )
  .join('\n\n')}

console.log('Initializing modules...')
${initCalls}

app.listen(PORT, () => {
  console.log(\`\\n🚀 Server running at http://localhost:\${PORT}\`)
  console.log(\`   Health check: http://localhost:\${PORT}/health\\n\`)
})
`
  }

  return `import dotenv from 'dotenv'
${modules}

dotenv.config()

console.log('Initializing modules...')
${initCalls}

console.log('\\n✅ All modules loaded. Ready to build!')
`
}

function buildIndexHtml(b: ForgeBlueprint): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${b.shortPitch}</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #0a0a0a; color: #e5e5e5; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    </style>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
}

function buildMainTsx(): string {
  return `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`
}

function buildAppTsx(b: ForgeBlueprint): string {
  const featureCards = b.mvpFeatures
    .map((f, i) => `          <div key={${i}} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardNumber}>0${i + 1}</span>
              <span style={styles.complexity(\'${f.complexity}\')}>${f.complexity}</span>
            </div>
            <h3 style={styles.cardTitle}>${f.name}</h3>
            <p style={styles.cardDesc}>${f.userStory}</p>
            <span style={styles.estimate}>~${f.estimateDays} days</span>
          </div>`)
    .join('\n')

  const endpointRows = b.architecture.apiEndpoints
    .map((e) => `          <tr>
            <td style={styles.method}><span style={styles.methodBadge}>${e.method}</span></td>
            <td style={styles.path}>${e.path}</td>
            <td style={styles.endpointDesc}>${e.description}</td>
          </tr>`)
    .join('\n')

  const stackItems = b.techStack
    .map((t) => `          <div style={styles.stackItem}>
            <span style={styles.stackLayer}>${t.layer}</span>
            <span style={styles.stackTech}>${t.technology}</span>
          </div>`)
    .join('\n')

  return `import { useState, useEffect } from 'react'

const colors = {
  bg: '#0a0a0a',
  surface: '#141414',
  border: '#222',
  accent: '#00ff41',
  accentDim: 'rgba(0,255,65,0.15)',
  text: '#e5e5e5',
  textDim: '#888',
  low: '#22c55e',
  medium: '#eab308',
  high: '#ef4444',
}

const styles: Record<string, any> = {
  container: { maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' },
  header: { marginBottom: '3rem' },
  tag: { fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.15em', color: colors.accent, textTransform: 'uppercase' as const, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: 700, lineHeight: 1.2, marginBottom: 12 },
  status: (ok: boolean) => ({ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', background: ok ? 'rgba(0,255,65,0.1)' : 'rgba(239,68,68,0.1)', color: ok ? colors.low : colors.high, border: \`1px solid \${ok ? 'rgba(0,255,65,0.25)' : 'rgba(239,68,68,0.25)'}\` }),
  dot: (ok: boolean) => ({ width: 7, height: 7, borderRadius: '50%', background: ok ? colors.low : colors.high }),
  section: { marginBottom: '3rem' },
  sectionTitle: { fontSize: 13, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', color: colors.accent, textTransform: 'uppercase' as const, marginBottom: 16, paddingBottom: 8, borderBottom: \`1px solid \${colors.border}\` },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 },
  card: { background: colors.surface, border: \`1px solid \${colors.border}\`, borderRadius: 10, padding: '20px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardNumber: { fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: colors.textDim },
  complexity: (level: string) => ({ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' as const, color: level === 'low' ? colors.low : level === 'medium' ? colors.medium : colors.high, background: level === 'low' ? 'rgba(34,197,94,0.12)' : level === 'medium' ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)' }),
  cardTitle: { fontSize: 16, fontWeight: 600, marginBottom: 6 },
  cardDesc: { fontSize: 13, color: colors.textDim, lineHeight: 1.5 },
  estimate: { display: 'inline-block', marginTop: 10, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: colors.textDim },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  method: { padding: '10px 12px', borderBottom: \`1px solid \${colors.border}\` },
  methodBadge: { fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: colors.accent },
  path: { fontFamily: 'JetBrains Mono, monospace', padding: '10px 12px', borderBottom: \`1px solid \${colors.border}\`, color: colors.text },
  endpointDesc: { padding: '10px 12px', borderBottom: \`1px solid \${colors.border}\`, color: colors.textDim },
  stackItem: { display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: colors.surface, border: \`1px solid \${colors.border}\`, borderRadius: 8, marginBottom: 6 },
  stackLayer: { fontFamily: 'JetBrains Mono, monospace', fontSize: 11, textTransform: 'uppercase' as const, color: colors.accent, letterSpacing: '0.1em' },
  stackTech: { fontSize: 14, fontWeight: 500 },
  footer: { marginTop: '3rem', padding: '20px 0', borderTop: \`1px solid \${colors.border}\`, fontSize: 12, color: colors.textDim, fontFamily: 'JetBrains Mono, monospace' },
}

export default function App() {
  const [health, setHealth] = useState<string>('checking...')

  useEffect(() => {
    fetch('http://localhost:3000/health')
      .then(r => r.json())
      .then(d => setHealth(d.status))
      .catch(() => setHealth('offline'))
  }, [])

  const ok = health === 'ok'

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.tag}>Venture AI Scaffold</div>
        <h1 style={styles.title}>${b.shortPitch}</h1>
        <div style={styles.status(ok)}>
          <span style={styles.dot(ok)} />
          API {health}
        </div>
      </header>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Tech Stack</h2>
${stackItems}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>MVP Features</h2>
        <div style={styles.grid}>
${featureCards}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>API Endpoints</h2>
        <table style={styles.table}>
          <tbody>
${endpointRows}
          </tbody>
        </table>
      </section>

      <footer style={styles.footer}>
        scaffolded by venture ai &middot; read BLUEPRINT.md for the full architecture
      </footer>
    </div>
  )
}
`
}

function buildViteConfig(): string {
  return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
`
}

function buildModuleFile(m: ArchitectureModule, b: ForgeBlueprint): string {
  const endpoints = b.architecture.apiEndpoints
    .filter((e) => e.path.toLowerCase().includes(m.name.toLowerCase().replace(/[^a-z]+/g, '')))
  const endpointComment = endpoints.length
    ? `\n// Related endpoints:\n${endpoints.map((e) => `//   ${e.method} ${e.path} — ${e.description}`).join('\n')}\n`
    : ''

  const safe = m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `/**
 * ${m.name}
 * ${m.responsibility}
 *
 * Generated by Venture AI Forge.
 */${endpointComment}

export function ${camelCase(safe)}() {
  console.log('[${m.name}] initialized')
}
`
}

function buildTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        outDir: 'dist',
        rootDir: 'src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        resolveJsonModule: true,
      },
      include: ['src'],
    },
    null,
    2,
  )
}

function camelCase(s: string): string {
  return s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
}
