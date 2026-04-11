/**
 * Deck — Phase 2 agent. Generates pitch deck content + Google Slides export.
 * Currently stubbed with a plausible 12-slide scaffold so the pipeline ships.
 */
import type { ScoutOutput } from './Scout.js'
import type { AtlasOutput } from './Atlas.js'

export interface DeckOutput {
  slides: string[]
  pptxUrl: string
  slidesUrl: string
}

export async function runDeck(
  reportId: string,
  _idea: string,
  _scout: ScoutOutput,
  _atlas: AtlasOutput,
): Promise<DeckOutput> {
  return {
    slides: [
      'Company purpose',
      'Problem',
      'Solution',
      'Why now',
      'Market size',
      'Competition',
      'Product',
      'Business model',
      'Team',
      'Financials',
      'Ask',
      'Vision',
    ],
    pptxUrl: `https://storage.agentconnect.dev/decks/${reportId}.pptx`,
    slidesUrl: `https://docs.google.com/presentation/d/${reportId}`,
  }
}
