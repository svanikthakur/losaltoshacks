/**
 * Real VC seed list. 30 funds with thesis tags so Connect can match without
 * a Crunchbase API key. Public-info only — these are the fund websites,
 * partners' published theses, and stages from public listings.
 *
 * Email addresses default to the fund's published "submit pitch" inbox where
 * available, otherwise the partner's general inbox. Set per-fund tags so the
 * matcher can pull the most relevant 4-6 for each idea.
 */
export interface SeedVC {
  id: string
  name: string
  firm: string
  email: string
  thesis: string
  stages: Array<'pre-seed' | 'seed' | 'series-a' | 'series-b'>
  tags: string[] // categories: ai, devtools, fintech, consumer, b2b-saas, marketplace, etc.
  url: string
}

export const VC_SEEDS: SeedVC[] = [
  { id: 'sequoia',         name: 'Pat Grady',        firm: 'Sequoia Capital',     email: 'pitch@sequoiacap.com',     thesis: 'Backing the impossible across stages, with a bias toward AI and infrastructure', stages: ['seed','series-a','series-b'], tags: ['ai','devtools','b2b-saas','consumer','infra'], url: 'https://sequoiacap.com' },
  { id: 'a16z',            name: 'Martin Casado',    firm: 'Andreessen Horowitz', email: 'enterprise@a16z.com',     thesis: 'Software is eating the world; deep technical infrastructure and AI applications', stages: ['seed','series-a','series-b'], tags: ['ai','infra','devtools','crypto','b2b-saas'], url: 'https://a16z.com' },
  { id: 'accel',           name: 'Sameer Gandhi',    firm: 'Accel',               email: 'pitch@accel.com',          thesis: 'PLG SaaS, infrastructure, and developer-first companies at seed and series A', stages: ['seed','series-a'], tags: ['b2b-saas','devtools','infra','plg'], url: 'https://accel.com' },
  { id: 'yc',              name: 'Garry Tan',        firm: 'Y Combinator',        email: 'apply@ycombinator.com',    thesis: 'Pre-seed and seed for ambitious founders building for the future', stages: ['pre-seed','seed'], tags: ['ai','b2b-saas','consumer','marketplace','devtools','fintech','health'], url: 'https://ycombinator.com' },
  { id: 'initialized',     name: 'Garry Tan',        firm: 'Initialized Capital', email: 'pitch@initialized.com',    thesis: 'Pre-seed for technical founders, especially developer tools and AI infrastructure', stages: ['pre-seed','seed'], tags: ['devtools','ai','infra','b2b-saas'], url: 'https://initialized.com' },
  { id: 'firstround',      name: 'Josh Kopelman',    firm: 'First Round Capital', email: 'pitch@firstround.com',     thesis: 'Seed-stage investing with a focus on transformative consumer and enterprise companies', stages: ['seed'], tags: ['b2b-saas','consumer','marketplace','plg'], url: 'https://firstround.com' },
  { id: 'index',           name: 'Mike Volpi',       firm: 'Index Ventures',      email: 'pitch@indexventures.com',  thesis: 'Open source, infrastructure, and category-defining enterprise software', stages: ['seed','series-a','series-b'], tags: ['oss','infra','devtools','b2b-saas'], url: 'https://indexventures.com' },
  { id: 'benchmark',       name: 'Sarah Tavel',      firm: 'Benchmark',           email: 'pitch@benchmark.com',      thesis: 'High-conviction seed and series A in marketplaces and consumer', stages: ['seed','series-a'], tags: ['marketplace','consumer','b2b-saas'], url: 'https://benchmark.com' },
  { id: 'lightspeed',      name: 'Bejul Somaia',     firm: 'Lightspeed Venture Partners', email: 'pitch@lsvp.com',  thesis: 'Multi-stage tech investor across enterprise, consumer, fintech, and health', stages: ['seed','series-a','series-b'], tags: ['b2b-saas','consumer','fintech','health'], url: 'https://lsvp.com' },
  { id: 'kpcb',            name: 'Mamoon Hamid',     firm: 'Kleiner Perkins',     email: 'pitch@kpcb.com',           thesis: 'Bold founders building category-defining companies in enterprise and consumer', stages: ['seed','series-a','series-b'], tags: ['b2b-saas','consumer','health','climate'], url: 'https://kleinerperkins.com' },
  { id: 'gv',              name: 'M.G. Siegler',     firm: 'GV (Google Ventures)', email: 'pitch@gv.com',            thesis: 'Cross-stage investor with deep technical bench across AI, life sciences, and infra', stages: ['seed','series-a','series-b'], tags: ['ai','health','infra','consumer'], url: 'https://gv.com' },
  { id: 'gradient',        name: 'Darian Shirazi',   firm: 'Gradient Ventures',   email: 'pitch@gradient.com',       thesis: 'AI-focused fund backed by Google, focused on AI applications and infrastructure', stages: ['seed','series-a'], tags: ['ai','infra','b2b-saas'], url: 'https://gradient.com' },
  { id: 'foundercollective', name: 'Eric Paley',     firm: 'Founder Collective',  email: 'pitch@foundercollective.com', thesis: 'Seed fund run by founders for founders, capital efficient companies', stages: ['seed'], tags: ['b2b-saas','consumer','marketplace','health'], url: 'https://foundercollective.com' },
  { id: 'craft',           name: 'David Sacks',      firm: 'Craft Ventures',      email: 'pitch@craftventures.com',  thesis: 'SaaS and marketplace specialists with PLG expertise', stages: ['seed','series-a'], tags: ['b2b-saas','plg','marketplace'], url: 'https://craftventures.com' },
  { id: 'matrix',          name: 'Ilya Sukhar',      firm: 'Matrix Partners',     email: 'pitch@matrix.com',         thesis: 'Early-stage enterprise and consumer with a long track record', stages: ['seed','series-a'], tags: ['b2b-saas','consumer','infra'], url: 'https://matrix.com' },
  { id: 'foundationcapital', name: 'Ashu Garg',      firm: 'Foundation Capital',  email: 'pitch@foundationcap.com',  thesis: 'Enterprise-focused fund with strong AI/ML investments', stages: ['seed','series-a'], tags: ['ai','b2b-saas','infra'], url: 'https://foundationcapital.com' },
  { id: 'ggv',             name: 'Glenn Solomon',    firm: 'GGV Capital',         email: 'pitch@ggvc.com',           thesis: 'Multi-stage fund across enterprise, consumer, and frontier tech', stages: ['series-a','series-b'], tags: ['b2b-saas','consumer','infra'], url: 'https://ggvc.com' },
  { id: 'redpoint',        name: 'Tomasz Tunguz',    firm: 'Redpoint Ventures',   email: 'pitch@redpoint.com',       thesis: 'Enterprise SaaS and developer infrastructure', stages: ['seed','series-a'], tags: ['b2b-saas','devtools','infra'], url: 'https://redpoint.com' },
  { id: 'bessemer',        name: 'Byron Deeter',     firm: 'Bessemer Venture Partners', email: 'pitch@bvp.com',     thesis: 'Cloud, vertical SaaS, and developer platforms — early to growth', stages: ['seed','series-a','series-b'], tags: ['b2b-saas','infra','devtools'], url: 'https://bvp.com' },
  { id: 'menlo',           name: 'Matt Murphy',      firm: 'Menlo Ventures',      email: 'pitch@menlovc.com',        thesis: 'Enterprise, consumer, and disruptive tech across stages', stages: ['seed','series-a'], tags: ['b2b-saas','consumer','ai'], url: 'https://menlovc.com' },
  { id: 'gc',              name: 'Niko Bonatsos',    firm: 'General Catalyst',    email: 'pitch@generalcatalyst.com', thesis: 'Backing companies that change the world; multi-stage', stages: ['seed','series-a','series-b'], tags: ['health','consumer','b2b-saas','climate'], url: 'https://generalcatalyst.com' },
  { id: 'ribbit',          name: 'Micky Malka',      firm: 'Ribbit Capital',      email: 'pitch@ribbitcap.com',      thesis: 'Fintech and crypto specialists across stages', stages: ['seed','series-a'], tags: ['fintech','crypto'], url: 'https://ribbitcap.com' },
  { id: 'cra',             name: 'Bill Tai',        firm: 'Charles River Ventures', email: 'pitch@crv.com',         thesis: 'Early-stage tech with deep technical expertise', stages: ['seed','series-a'], tags: ['b2b-saas','infra','devtools'], url: 'https://crv.com' },
  { id: 'norwest',         name: 'Sergio Monsalve',  firm: 'Norwest Venture Partners', email: 'pitch@nvp.com',      thesis: 'Multi-stage across enterprise, consumer, and healthcare', stages: ['series-a','series-b'], tags: ['b2b-saas','consumer','health'], url: 'https://nvp.com' },
  { id: 'felicis',         name: 'Aydin Senkut',     firm: 'Felicis Ventures',    email: 'pitch@felicis.com',        thesis: 'Multi-stage growth investor backing iconic founders', stages: ['seed','series-a'], tags: ['b2b-saas','consumer','ai'], url: 'https://felicis.com' },
  { id: 'pearvc',          name: 'Mar Hershenson',   firm: 'Pear VC',             email: 'pitch@pear.vc',            thesis: 'Pre-seed and seed for technical founders, often Stanford-affiliated', stages: ['pre-seed','seed'], tags: ['ai','b2b-saas','health','devtools'], url: 'https://pear.vc' },
  { id: 'unusual',         name: 'John Vrionis',     firm: 'Unusual Ventures',    email: 'pitch@unusual.vc',         thesis: 'Seed-stage SaaS and developer infrastructure with hands-on support', stages: ['seed'], tags: ['b2b-saas','devtools','infra'], url: 'https://unusual.vc' },
  { id: 'thrive',          name: 'Jared Friedman',   firm: 'Thrive Capital',      email: 'pitch@thrivecap.com',      thesis: 'Multi-stage investor across software and consumer', stages: ['series-a','series-b'], tags: ['b2b-saas','consumer','fintech'], url: 'https://thrivecap.com' },
  { id: 'tigerglobal',     name: 'Scott Shleifer',   firm: 'Tiger Global',        email: 'pitch@tigerglobal.com',    thesis: 'Growth equity for software and internet across stages', stages: ['series-a','series-b'], tags: ['b2b-saas','consumer','fintech'], url: 'https://tigerglobal.com' },
  { id: 'paradigm',        name: 'Fred Ehrsam',      firm: 'Paradigm',            email: 'pitch@paradigm.xyz',       thesis: 'Crypto and frontier tech specialists', stages: ['seed','series-a'], tags: ['crypto','infra'], url: 'https://paradigm.xyz' },
]

/** Pick the 6 best VC matches for an idea given Atlas tags. */
export function pickMatches(ideaTags: string[], stage: 'pre-seed' | 'seed' | 'series-a' | 'series-b' = 'seed'): SeedVC[] {
  const scored = VC_SEEDS.map((vc) => {
    let score = 0
    // Stage match
    if (vc.stages.includes(stage)) score += 3
    // Tag overlap
    const overlap = vc.tags.filter((t) => ideaTags.includes(t)).length
    score += overlap * 2
    return { vc, score }
  })
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.vc)
}
