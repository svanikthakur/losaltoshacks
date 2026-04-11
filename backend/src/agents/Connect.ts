/**
 * Connect — Phase 2 agent. VC matching, outreach, Google Sheet export.
 * Currently stubbed. Returns a plausible ranked list so the frontend renders.
 */
import type { AtlasOutput } from './Atlas.js'

export interface ConnectOutput {
  investors: Array<{ name: string; thesis: string; fit: number }>
  sheetsUrl: string
}

export async function runConnect(
  reportId: string,
  _idea: string,
  _atlas: AtlasOutput,
): Promise<ConnectOutput> {
  return {
    investors: [
      { name: 'Sequoia Capital', thesis: 'Seed / AI', fit: 0.92 },
      { name: 'Accel', thesis: 'SaaS / PLG', fit: 0.88 },
      { name: 'Y Combinator', thesis: 'Pre-seed', fit: 0.95 },
      { name: 'Initialized', thesis: 'Developer tools', fit: 0.84 },
    ],
    sheetsUrl: `https://docs.google.com/spreadsheets/d/${reportId}`,
  }
}
