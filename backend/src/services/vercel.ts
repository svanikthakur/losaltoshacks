/**
 * Vercel Deploy — pushes a single HTML file as a static site and returns a live URL.
 *
 * Uses the Vercel Deployments API v13:
 *   POST https://api.vercel.com/v13/deployments
 *
 * The LaunchKit agent already generates landingHtml — this service takes that
 * HTML string, wraps it as an index.html file, and deploys it to Vercel's edge
 * network in ~5 seconds. Returns a real public URL the founder can send to investors.
 */
import axios from 'axios'

const VERCEL_API = 'https://api.vercel.com'

function getToken(): string | null {
  return process.env.VERCEL_TOKEN || null
}

export interface DeployResult {
  url: string
  readyState: string
  id: string
}

export async function deployLandingPage(
  projectName: string,
  html: string,
): Promise<DeployResult> {
  const token = getToken()
  if (!token) throw new Error('VERCEL_TOKEN not set')

  const safeName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'venture-ai-landing'

  const body = {
    name: safeName,
    files: [
      {
        file: 'index.html',
        data: Buffer.from(html, 'utf-8').toString('base64'),
        encoding: 'base64',
      },
    ],
    projectSettings: {
      framework: null,
    },
    target: 'production',
  }

  const teamId = process.env.VERCEL_TEAM_ID
  const params = teamId ? `?teamId=${teamId}` : ''

  const res = await axios.post(`${VERCEL_API}/v13/deployments${params}`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  })

  const data = res.data as { url?: string; readyState?: string; id?: string }
  return {
    url: data.url ? `https://${data.url}` : '',
    readyState: data.readyState || 'UNKNOWN',
    id: data.id || '',
  }
}
