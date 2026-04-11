/**
 * Minimal GitHub REST wrapper. Uses node's global fetch — no SDK needed.
 * Requires GITHUB_TOKEN (classic `repo` scope or fine-grained with Admin + Contents).
 */

const GH = 'https://api.github.com'

function authHeaders() {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN not set')
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function ghFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GH}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`github ${res.status} ${path}: ${txt.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

/** Create a repo on the authenticated user's account. */
export async function createRepo(args: {
  name: string
  description: string
}): Promise<{ htmlUrl: string; owner: string; repo: string; defaultBranch: string }> {
  const body = await ghFetch<any>('/user/repos', {
    method: 'POST',
    body: JSON.stringify({
      name: args.name,
      description: args.description,
      private: false,
      auto_init: true, // creates initial README so we can commit more files
      has_issues: false,
      has_projects: false,
      has_wiki: false,
    }),
  })
  return {
    htmlUrl: body.html_url,
    owner: body.owner.login,
    repo: body.name,
    defaultBranch: body.default_branch || 'main',
  }
}

/** PUT a file via the Contents API. Creates or updates. */
export async function putFile(args: {
  owner: string
  repo: string
  path: string
  content: string
  message: string
  branch?: string
}): Promise<void> {
  // Fetch current SHA if file exists (for updates)
  let sha: string | undefined
  try {
    const existing = await ghFetch<any>(
      `/repos/${args.owner}/${args.repo}/contents/${args.path}${args.branch ? `?ref=${args.branch}` : ''}`,
    )
    sha = existing?.sha
  } catch {
    // 404 = file doesn't exist yet, which is fine
  }

  await ghFetch(`/repos/${args.owner}/${args.repo}/contents/${args.path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: args.message,
      content: Buffer.from(args.content, 'utf8').toString('base64'),
      branch: args.branch,
      sha,
    }),
  })
}

/** Generate a safe, unique-enough repo slug from a free-form idea. */
export function slugify(idea: string): string {
  const base = idea
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'mvp'
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base}-${suffix}`
}
