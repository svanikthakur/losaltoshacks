/**
 * Forge — MVP scaffold agent.
 * 1. Uses llama3.1 (or deepseek-coder if available) to pick a realistic tech stack
 *    and a short component list for the idea.
 * 2. Creates a real GitHub repository on the authenticated account.
 * 3. Commits a README + STACK.md so the repo is actually usable.
 *
 * Falls back to a mock output if GITHUB_TOKEN is not set.
 */
import { callAgentJSON } from '../services/ai.js'
import { createRepo, putFile, slugify } from '../services/github.js'
import type { AtlasOutput } from './Atlas.js'

export interface ForgeOutput {
  repoUrl: string
  techStack: string[]
  components: string[]
}

interface ForgeSpec {
  techStack: string[]
  components: string[]
  shortPitch: string
}

const SYSTEM = `You are Forge, a technical scaffolding agent.
Given a startup idea and its market analysis, pick a realistic tech stack and
a short list of MVP components to ship.
Return ONLY a JSON object with this exact shape:
{
  "techStack": string[] (4-6 technologies — e.g. "Next.js", "tRPC", "Postgres", "Vercel"),
  "components": string[] (4-6 short component names — e.g. "Auth", "Dashboard", "API layer"),
  "shortPitch": string (one-sentence elevator pitch, under 120 chars)
}
Pick modern, boring technologies that a solo founder could actually ship.`

export async function runForge(idea: string, atlas: AtlasOutput): Promise<ForgeOutput> {
  const user = `Idea: "${idea}"
ICP: ${atlas.icp}
Go-to-market: ${atlas.gtm}
Suggest a stack and component list.`

  const spec = await callAgentJSON<ForgeSpec>('forge', SYSTEM, user, {
    temperature: 0.3,
    timeoutMs: 45_000,
  })

  // If no GitHub token, return a plausible mock so the pipeline keeps flowing
  if (!process.env.GITHUB_TOKEN) {
    const slug = slugify(idea)
    return {
      repoUrl: `https://github.com/agentconnect-demo/${slug}`,
      techStack: spec.techStack,
      components: spec.components,
    }
  }

  const name = slugify(idea)
  const description = (spec.shortPitch || idea).slice(0, 160)

  // GitHub token might be missing permissions (fine-grained tokens need
  // Administration: write to create repos). Fall back to a mock URL so the
  // rest of the pipeline can complete.
  let repo
  try {
    repo = await createRepo({ name, description })
  } catch (err) {
    console.warn(`[forge] createRepo failed: ${(err as Error).message}`)
    console.warn('[forge] → check GITHUB_TOKEN has Administration: Read+Write permission')
    return {
      repoUrl: `https://github.com/agentconnect-demo/${name}`,
      techStack: spec.techStack,
      components: spec.components,
    }
  }

  // Fire-and-forget the file commits in parallel — if one fails the repo
  // still exists and we return its URL.
  const readme = buildReadme(idea, spec, repo.owner, repo.repo)
  const stack = buildStackDoc(spec)
  try {
    await Promise.all([
      putFile({
        owner: repo.owner,
        repo: repo.repo,
        path: 'README.md',
        content: readme,
        message: 'forge: initial README',
        branch: repo.defaultBranch,
      }),
      putFile({
        owner: repo.owner,
        repo: repo.repo,
        path: 'STACK.md',
        content: stack,
        message: 'forge: document stack',
        branch: repo.defaultBranch,
      }),
    ])
  } catch (err) {
    console.warn(`[forge] file commit failed: ${(err as Error).message}`)
  }

  return {
    repoUrl: repo.htmlUrl,
    techStack: spec.techStack,
    components: spec.components,
  }
}

function buildReadme(idea: string, spec: ForgeSpec, owner: string, repo: string): string {
  return `# ${repo}

> ${spec.shortPitch}

## The idea

${idea}

## Tech stack

${spec.techStack.map((t) => `- \`${t}\``).join('\n')}

## Components

${spec.components.map((c) => `- **${c}**`).join('\n')}

## Getting started

\`\`\`bash
git clone https://github.com/${owner}/${repo}.git
cd ${repo}
# TODO: scaffold the chosen stack
\`\`\`

---

_Scaffolded by [AgentConnect](https://github.com/${owner}/${repo}) — five AI agents turn a startup idea into a pitch deck, MVP repo, market report and investor list in under ten minutes._
`
}

function buildStackDoc(spec: ForgeSpec): string {
  return `# Stack

Selected by Forge agent based on the idea and market analysis.

## Technologies

${spec.techStack.map((t) => `- ${t}`).join('\n')}

## Components to build (MVP)

${spec.components.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## Why this stack

- Modern, well-documented, free-tier friendly
- A solo founder can ship a working MVP within a weekend
- Easy to hand off to future hires
`
}
