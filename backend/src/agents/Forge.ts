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

  // Path B — real .zip scaffold
  await mkdir(STORAGE_DIR, { recursive: true })
  const zip = new JSZip()
  zip.file('README.md', buildReadme(idea, blueprint, 'venture-ai', slug))
  zip.file('BLUEPRINT.md', buildBlueprintDoc(blueprint))
  zip.file('package.json', buildPackageJson(slug, blueprint))
  zip.file('.gitignore', 'node_modules\ndist\n.env\n.DS_Store\n*.log\n')
  zip.file('.env.example', '# Add your real env vars here\nPORT=3000\n')
  const withFe = hasFrontend(blueprint)
  const serverDir = withFe ? 'src/server' : 'src'

  zip.file(`${serverDir}/index.ts`, buildEntryPoint(blueprint))
  zip.file('tsconfig.json', buildTsConfig())
  for (const m of blueprint.architecture.modules) {
    const safeName = m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    zip.file(`${serverDir}/${safeName}/index.ts`, buildModuleFile(m, blueprint))
  }

  if (withFe) {
    zip.file('index.html', buildIndexHtml(blueprint))
    zip.file('src/main.tsx', buildMainTsx())
    zip.file('src/App.tsx', buildAppTsx(blueprint))
    zip.file('vite.config.ts', buildViteConfig())
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
