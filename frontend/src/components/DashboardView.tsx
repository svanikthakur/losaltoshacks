/**
 * DashboardView — post-pipeline report.
 *
 * Renders every agent output against the current structured shapes:
 *   Scout   → competitors / differentiationAngles / marketSignals / collision / demand
 *   Atlas   → TAM/SAM/SOM + topRegions + customerSegments + tailwinds/headwinds
 *   Forge   → techStack (objects) + mvpFeatures + architecture + roadmap
 *   Deck    → oneLiner + elevatorPitch + 10 slides + .pptx
 *   Connect → topVCs + readiness breakdown + accelerators + fundraising strategy
 */
import { useEffect, useState } from 'react'
import BorderGlow from './BorderGlow'
import { api } from '../lib/api'
import FeatureHub from './FeatureHub'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts'

type Maybe<T> = T | undefined | null

interface ScoutCompetitor {
  name: string
  stage: string
  weakness: string
  funding: string
}
interface ScoutMarketSignal {
  source: string
  signal: string
  evidenceUrl?: string
}
interface ScoutSource {
  title: string
  url: string
  snippet: string
  domain?: string
  trustScore?: number
}
interface ScoutArticle {
  headline: string
  lede: string
  body: string
}
interface SolanaProtocol {
  name: string
  category: string
  tvl: number
  change1d: number | null
  change7d: number | null
  change30d: number | null
  url: string
  logo: string | null
}
interface SolanaNetwork {
  absoluteSlot: number | null
  epoch: number | null
  transactionCount: number | null
  sampleTps: number | null
}
interface SolanaSnapshot {
  relevant: boolean
  queryTerms: string[]
  protocols: SolanaProtocol[]
  network: SolanaNetwork | null
  summary: string
}

interface PhLaunch {
  id: string
  name: string
  tagline: string
  url: string
  votesCount: number
  createdAt: string
  thumbnailUrl?: string
  topics: string[]
}
interface YcMatch {
  name: string
  slug: string
  one_liner: string
  website: string
  batch: string
  status: string
  score: number
}
interface InternalIdeaMatch {
  reportId: string
  founderId: string
  ideaText: string
  createdAt: number
  score: number
}
interface CollisionReport {
  score: number
  summary: string
  breakdown: {
    productHunt: number
    ycCompanies: number
    internalIdeas: number
  }
  productHuntLaunches: PhLaunch[]
  ycCompanies: YcMatch[]
  internalIdeas: InternalIdeaMatch[]
}
interface ScoutOut {
  competitors?: ScoutCompetitor[]
  collisionScore?: number
  demandLevel?: string
  differentiationAngles?: string[]
  marketSignals?: ScoutMarketSignal[]
  marketArticle?: ScoutArticle
  sources?: ScoutSource[]
  summary?: string
  onchain?: SolanaSnapshot
  collision?: CollisionReport
}

interface RegionEntry { name: string; why: string }
interface CustomerSegment {
  tier: string
  description: string
  size: string
  acquisitionChannel: string
}
interface AtlasOut {
  tam?: string
  sam?: string
  som?: string
  marketSizingRationale?: string
  topRegions?: RegionEntry[]
  launchRegion?: string
  customerSegments?: CustomerSegment[]
  tailwinds?: string[]
  headwinds?: string[]
  opportunityScore?: number
  summary?: string
}

interface TechStackEntry {
  layer: string
  technology: string
  justification: string
}
interface MvpFeature {
  name: string
  userStory: string
  complexity: string
  estimateDays: number
}
interface ArchitectureModule { name: string; responsibility: string }
interface ArchitectureEndpoint { method: string; path: string; description: string }
interface RoadmapPhase { weeks: string; goal: string; deliverables: string[] }
interface ForgeOut {
  techStack?: Array<TechStackEntry | string>
  mvpFeatures?: MvpFeature[]
  cutList?: string[]
  architecture?: {
    modules?: ArchitectureModule[]
    dataFlow?: string
    apiEndpoints?: ArchitectureEndpoint[]
  }
  buildRoadmap?: RoadmapPhase[]
  buildabilityScore?: number
  shortPitch?: string
  repoUrl?: string | null
  zipUrl?: string | null
  error?: string
}

interface Slide {
  number: number
  section: string
  title: string
  content: string[]
  speakerNotes: string
  imageUrl?: string
  imageCredit?: string
}
interface DeckTheme {
  moodDescriptor?: string
  bgColor?: string
  panelColor?: string
  inkColor?: string
  inkDimColor?: string
  accentColor?: string
  accentSoftColor?: string
  fontDisplay?: string
  fontBody?: string
}
interface DeckOut {
  oneLiner?: string
  elevatorPitch?: string
  startupName?: string
  slides?: Slide[]
  theme?: DeckTheme
  pptxUrl?: string
}

interface Engagement {
  bonus: number
  stages: string[]
  sentAt: number | null
  deliveredAt: number | null
  openedAt: number | null
  clickedAt: number | null
  bouncedAt: number | null
  openCount: number
  clickCount: number
}
interface ConnectInvestor {
  id: string
  name: string
  firm: string
  email: string
  checkSize: string
  compatibilityScore: number
  thesisMatch: string
  draftEmail: { subject: string; body: string }
  engagement?: Engagement | null
  effectiveScore?: number
}
interface InvestorReadinessBreakdown {
  narrative: number
  market: number
  team: number
  traction: number
  financials: number
}
interface AcceleratorRec { name: string; fitScore: number; why: string; url: string }
interface FundraisingStrategy {
  amount: string
  valuationRange: string
  timelineWeeks: number
  notes: string
}
interface ConnectOut {
  topVCs?: ConnectInvestor[]
  investorReadinessScore?: number
  investorReadinessBreakdown?: InvestorReadinessBreakdown
  accelerators?: AcceleratorRec[]
  fundraisingStrategy?: FundraisingStrategy
  ideaTags?: string[]
}

interface PivotIdea {
  rank: number
  pivotIdea: string
  newTargetMarket: string
  newCoreFeature: string
  estimatedScore: number
  whyLessCompetition: string
  marketSizeEst?: string
}
interface PivotOut {
  pivots?: PivotIdea[]
}

interface ReportLike {
  id: string
  idea: string
  validation_score?: number | null
  scout_output?: Maybe<ScoutOut>
  atlas_output?: Maybe<AtlasOut>
  forge_output?: Maybe<ForgeOut>
  deck_output?: Maybe<DeckOut>
  connect_output?: Maybe<ConnectOut>
  pivot_output?: Maybe<PivotOut>
}

export default function DashboardView({ report }: { report: ReportLike }) {
  const scout = (report.scout_output || {}) as ScoutOut
  const atlas = (report.atlas_output || {}) as AtlasOut
  const forge = (report.forge_output || {}) as ForgeOut
  const deck = (report.deck_output || {}) as DeckOut
  const connect = (report.connect_output || {}) as ConnectOut

  const validationScore =
    report.validation_score ??
    (atlas.opportunityScore != null ? Math.round(atlas.opportunityScore / 10) : null)

  return (
    <main className="pt-32 pb-24 min-h-screen">
      <div className="shell space-y-12">
        <Header idea={report.idea} score={validationScore} opportunity={atlas.opportunityScore} />

        <QuickStats scout={scout} atlas={atlas} forge={forge} connect={connect} validationScore={validationScore} />

        {/* ═══ SECTION 1: MARKET INTELLIGENCE ═══ */}
        <SectionDivider num="01" label="SCOUT" sub="Market intelligence & demand sensing" />
        {scout.marketArticle && <MarketArticle scout={scout} />}
        {!scout.marketArticle && scout.summary && <ScoutSummary scout={scout} />}

        {/* ═══ SECTION 2: MARKET SIZING & OPPORTUNITY ═══ */}
        {atlas.tam && (
          <>
            <SectionDivider num="02" label="ATLAS" sub="Global demand mapping & market sizing" />
            <StrategicPlan atlas={atlas} />
            <AtlasGrowthChart atlas={atlas} />
          </>
        )}

        {/* ═══ AUTO-PIVOT ═══ */}
        {report.pivot_output &&
          Array.isArray((report.pivot_output as PivotOut).pivots) &&
          ((report.pivot_output as PivotOut).pivots?.length ?? 0) > 0 && (
            <>
              <SectionDivider num="!!" label="PIVOT" sub="Opportunity below threshold — alternatives generated" />
              <PivotPanel pivots={((report.pivot_output as PivotOut).pivots ?? []) as PivotIdea[]} />
            </>
          )}

        {/* ═══ SECTION 3: PITCH DECK ═══ */}
        <SectionDivider num="03" label="DECK" sub="Pitch deck generation & slide content" />
        <DeckCard deck={deck} />
        <DeckSlides deck={deck} reportId={report.id} />

        {/* ═══ SECTION 4: TECHNICAL BLUEPRINT ═══ */}
        <SectionDivider num="04" label="FORGE" sub="Technical architecture & MVP scaffold" />
        <ForgeCard forge={forge} />
        {Array.isArray(forge.mvpFeatures) && forge.mvpFeatures.length > 0 && (
          <ForgeBlueprint forge={forge} />
        )}

        {/* ═══ SECTION 5: INVESTOR OUTREACH ═══ */}
        <SectionDivider num="05" label="CONNECT" sub="VC matching, outreach & tracking" />
        <ConnectSummaryCard connect={connect} />
        {Array.isArray(connect.topVCs) && connect.topVCs.length > 0 && (
          <InvestorList investors={connect.topVCs} reportId={report.id} />
        )}

        {/* ═══ SECTION 6: DOWNLOADS ═══ */}
        <SectionDivider num="06" label="EXPORT" sub="Download professional reports" />
        <div className="grid md:grid-cols-2 gap-4">
          <a
            href={`/api/export/validation-report/${report.id}?token=${typeof window !== 'undefined' ? localStorage.getItem('ac_token') : ''}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border p-6 flex items-center gap-4 transition hover:border-[var(--color-charge)]"
            style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-1)' }}
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,255,65,0.1)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-charge)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
            </div>
            <div>
              <div className="font-display text-lg font-bold text-ink">Validation Report</div>
              <div className="text-xs text-ink-dim">Full 5-agent report · 8 pages · PDF</div>
            </div>
          </a>
          <a
            href={`/api/export/market-research/${report.id}?token=${typeof window !== 'undefined' ? localStorage.getItem('ac_token') : ''}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border p-6 flex items-center gap-4 transition hover:border-[var(--color-charge)]"
            style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-surface-1)' }}
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(34,211,238,0.1)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
            </div>
            <div>
              <div className="font-display text-lg font-bold text-ink">Market Research</div>
              <div className="text-xs text-ink-dim">Scout + Atlas deep dive · 4 pages · PDF</div>
            </div>
          </a>
        </div>

        {/* ═══ SECTION 7: AI TOOLS ═══ */}
        <SectionDivider num="07" label="TOOLS" sub="AI-powered features & analysis" />
        <FeatureHub
          reportId={report.id}
          competitors={Array.isArray(scout.competitors) ? scout.competitors : undefined}
        />
      </div>
    </main>
  )
}

/* ================================================================ */
/* QUICK STATS ROW                                                   */
/* ================================================================ */
function QuickStats({
  scout,
  atlas,
  forge,
  connect,
  validationScore,
}: {
  scout: ScoutOut
  atlas: AtlasOut
  forge: ForgeOut
  connect: ConnectOut
  validationScore: number | null
}) {
  const stats = [
    { label: 'Validation', value: validationScore ?? '—', max: '/10', color: '#00FF41' },
    { label: 'Opportunity', value: atlas?.opportunityScore ?? '—', max: '/100', color: '#22D3EE' },
    { label: 'Collision', value: scout?.collisionScore ?? '—', max: '/100', color: '#F59E0B' },
    { label: 'Readiness', value: connect?.investorReadinessScore ?? '—', max: '/100', color: '#A855F7' },
    { label: 'Buildability', value: forge?.buildabilityScore ?? '—', max: '/100', color: '#34D399' },
    { label: 'Demand', value: scout?.demandLevel ?? '—', max: '', color: '#FB7185' },
  ]
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex-shrink-0 min-w-[130px] rounded-xl p-4"
          style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${s.color}22`,
          }}
        >
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted mb-2">
            {s.label}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl font-bold" style={{ color: s.color }}>
              {s.value}
            </span>
            {s.max && <span className="font-mono text-[10px] text-muted">{s.max}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ================================================================ */
/* HEADER                                                            */
/* ================================================================ */
function Header({
  idea,
  score,
  opportunity,
}: {
  idea: string
  score: number | null
  opportunity: number | undefined
}) {
  const displayScore = score ?? 0
  const scoreColor = displayScore >= 7 ? '#00FF41' : displayScore >= 5 ? '#FBBF24' : '#FB7185'
  return (
    <Glow>
      <div className="p-8 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--color-charge)' }}>
            // VALIDATION REPORT
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold uppercase tracking-[-0.02em] leading-[0.95]">
            {idea}
          </h1>
          {opportunity != null && (
            <div className="mt-4 font-mono text-xs text-muted">
              Atlas opportunity {opportunity}/100
            </div>
          )}
        </div>
        <div className="text-center min-w-[140px]">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-2">SCORE</div>
          <div className="font-display font-black text-7xl tracking-tight" style={{ color: scoreColor }}>
            {score ?? '—'}
          </div>
          <div className="font-mono text-xs text-muted mt-1">/ 10</div>
        </div>
      </div>
    </Glow>
  )
}

/* ================================================================ */
/* SCOUT — market article                                            */
/* ================================================================ */
function MarketArticle({ scout }: { scout: ScoutOut }) {
  const article = scout.marketArticle!
  return (
    <Glow>
      <div className="p-8">
        <Eyebrow>// 01 SCOUT · MARKET INTELLIGENCE</Eyebrow>
        <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight tracking-[-0.02em] mb-3">
          {article.headline}
        </h2>
        <p className="text-lg text-ink-dim italic mb-6">{article.lede}</p>
        <div className="prose-cyber text-base text-ink leading-[1.7] space-y-4 whitespace-pre-line">
          {article.body}
        </div>
        <ScoutStrip scout={scout} />
        {Array.isArray(scout.competitors) && scout.competitors.length > 0 && (
          <Competitors competitors={scout.competitors} />
        )}
        {Array.isArray(scout.differentiationAngles) && scout.differentiationAngles.length > 0 && (
          <DifferentiationAngles angles={scout.differentiationAngles} />
        )}
        {Array.isArray(scout.marketSignals) && scout.marketSignals.length > 0 && (
          <MarketSignals signals={scout.marketSignals} />
        )}
        {scout.collision && <CollisionPanel collision={scout.collision} />}
        {scout.onchain?.relevant && <OnchainPanel onchain={scout.onchain} />}
        {Array.isArray(scout.sources) && scout.sources.length > 0 && <Sources sources={scout.sources} />}
      </div>
    </Glow>
  )
}

function ScoutSummary({ scout }: { scout: ScoutOut }) {
  return (
    <Glow>
      <div className="p-8">
        <Eyebrow>// 01 SCOUT · MARKET INTELLIGENCE</Eyebrow>
        {scout.summary && <p className="text-base text-ink leading-relaxed mb-6">{scout.summary}</p>}
        <ScoutStrip scout={scout} />
        {Array.isArray(scout.competitors) && scout.competitors.length > 0 && (
          <Competitors competitors={scout.competitors} />
        )}
        {Array.isArray(scout.differentiationAngles) && scout.differentiationAngles.length > 0 && (
          <DifferentiationAngles angles={scout.differentiationAngles} />
        )}
        {Array.isArray(scout.marketSignals) && scout.marketSignals.length > 0 && (
          <MarketSignals signals={scout.marketSignals} />
        )}
        {scout.collision && <CollisionPanel collision={scout.collision} />}
        {scout.onchain?.relevant && <OnchainPanel onchain={scout.onchain} />}
        {Array.isArray(scout.sources) && scout.sources.length > 0 && <Sources sources={scout.sources} />}
      </div>
    </Glow>
  )
}

function ScoutStrip({ scout }: { scout: ScoutOut }) {
  const items: [string, string][] = [
    ['Demand', scout.demandLevel || '—'],
    ['Collision', scout.collisionScore != null ? `${scout.collisionScore} / 100` : '—'],
    ['Competitors', String(scout.competitors?.length ?? 0)],
    ['Signals', String(scout.marketSignals?.length ?? 0)],
  ]
  return (
    <div
      className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-px border"
      style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-border-1)' }}
    >
      {items.map(([k, v]) => (
        <div key={k} className="bg-[var(--color-void)] p-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted mb-1">{k}</div>
          <div className="font-display text-xl font-semibold uppercase">{v}</div>
        </div>
      ))}
    </div>
  )
}

function Competitors({ competitors }: { competitors: ScoutCompetitor[] }) {
  return (
    <div className="mt-8">
      <SectionLabel>› competitor brief</SectionLabel>
      <div className="grid md:grid-cols-2 gap-3">
        {competitors.slice(0, 8).map((c, i) => (
          <div key={i} className="border p-4" style={{ borderColor: 'rgba(0,255,65,0.15)' }}>
            <div className="flex items-baseline justify-between mb-2">
              <div className="font-display text-lg font-bold">{c.name}</div>
              <div className="font-mono text-[10px] text-muted">{c.stage}</div>
            </div>
            <div className="text-xs text-ink-dim mb-2">− {c.weakness}</div>
            {c.funding && <div className="text-xs font-mono text-accent mt-1">{c.funding}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function DifferentiationAngles({ angles }: { angles: string[] }) {
  return (
    <div className="mt-8">
      <SectionLabel>› 3 angles nobody is taking</SectionLabel>
      <ol className="space-y-2 text-sm text-ink">
        {angles.map((a, i) => (
          <li key={i} className="flex gap-3">
            <span className="font-mono text-accent">{String(i + 1).padStart(2, '0')}</span>
            {a}
          </li>
        ))}
      </ol>
    </div>
  )
}

function MarketSignals({ signals }: { signals: ScoutMarketSignal[] }) {
  return (
    <div className="mt-8">
      <SectionLabel>› live market signals</SectionLabel>
      <ul className="space-y-2">
        {signals.map((s, i) => (
          <li key={i} className="text-sm text-ink flex gap-3">
            <span className="font-mono text-[10px] uppercase text-muted w-16 flex-shrink-0 pt-0.5">
              {s.source}
            </span>
            <span>
              {s.signal}
              {s.evidenceUrl && (
                <a
                  href={s.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 text-accent hover:underline text-xs"
                >
                  ↗
                </a>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CollisionPanel({ collision }: { collision: CollisionReport }) {
  const color =
    collision.score >= 70 ? '#FB7185' : collision.score >= 40 ? '#FBBF24' : '#00FF41'
  return (
    <div className="mt-8">
      <SectionLabel>› cross-platform collision (live)</SectionLabel>
      <div
        className="border p-5 mb-4"
        style={{ borderColor: 'rgba(0,255,65,0.18)', background: 'rgba(0,255,65,0.03)' }}
      >
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-sm text-ink">{collision.summary}</div>
          <div
            className="font-display text-3xl font-bold leading-none flex-shrink-0 ml-4"
            style={{ color }}
          >
            {collision.score}
            <span className="font-mono text-xs text-muted ml-1">/ 100</span>
          </div>
        </div>
        <div
          className="grid grid-cols-3 gap-px border"
          style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-border-1)' }}
        >
          <Stat label="Product Hunt (90d)" value={String(collision.breakdown.productHunt)} />
          <Stat label="YC companies" value={String(collision.breakdown.ycCompanies)} />
          <Stat label="Internal ideas" value={String(collision.breakdown.internalIdeas)} />
        </div>
      </div>

      {collision.productHuntLaunches.length > 0 && (
        <div className="mb-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted mb-2">
            › product hunt launches (last 90d)
          </div>
          <div className="space-y-2">
            {collision.productHuntLaunches.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="block border p-3 hover:bg-white/[0.02] transition"
                style={{ borderColor: 'rgba(0,255,65,0.15)' }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-display text-base font-bold">{p.name}</div>
                  <div className="font-mono text-[10px] text-accent flex-shrink-0">
                    ▲ {p.votesCount}
                  </div>
                </div>
                <div className="text-xs text-ink-dim mt-1">{p.tagline}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {collision.ycCompanies.length > 0 && (
        <div className="mb-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted mb-2">
            › y combinator companies
          </div>
          <div className="space-y-2">
            {collision.ycCompanies.map((c) => (
              <a
                key={c.slug}
                href={c.website || `https://www.ycombinator.com/companies/${c.slug}`}
                target="_blank"
                rel="noreferrer"
                className="block border p-3 hover:bg-white/[0.02] transition"
                style={{ borderColor: 'rgba(0,255,65,0.15)' }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-display text-base font-bold">{c.name}</div>
                  <div className="font-mono text-[10px] text-muted flex-shrink-0">
                    {c.batch} · {c.status}
                  </div>
                </div>
                <div className="text-xs text-ink-dim mt-1">{c.one_liner}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {collision.internalIdeas.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted mb-2">
            › other Venture AI founders building here
          </div>
          <div className="space-y-2">
            {collision.internalIdeas.map((m) => (
              <div
                key={m.reportId}
                className="border p-3"
                style={{ borderColor: 'rgba(0,255,65,0.15)' }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-sm text-ink line-clamp-2">{m.ideaText}</div>
                  <div className="font-mono text-[10px] text-accent flex-shrink-0">
                    {m.score}% similar
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function OnchainPanel({ onchain }: { onchain: SolanaSnapshot }) {
  const fmt = (n: number) => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
    return `$${n.toFixed(0)}`
  }
  const pct = (v: number | null) =>
    v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
  const pctColor = (v: number | null) =>
    v == null ? '#6B6660' : v >= 0 ? '#2ECC71' : '#FB7185'

  return (
    <div className="mt-8">
      <SectionLabel>› solana on-chain demand signals (live)</SectionLabel>
      <div className="text-sm text-ink mb-4">{onchain.summary}</div>
      {onchain.network && (
        <div
          className="mb-4 p-3 grid grid-cols-2 md:grid-cols-4 gap-3 border"
          style={{ borderColor: 'rgba(0,255,65,0.15)' }}
        >
          <Stat label="slot" value={onchain.network.absoluteSlot?.toLocaleString() ?? '—'} />
          <Stat label="epoch" value={onchain.network.epoch?.toString() ?? '—'} />
          <Stat label="sample tps" value={onchain.network.sampleTps?.toString() ?? '—'} />
          <Stat
            label="all-time tx"
            value={
              onchain.network.transactionCount
                ? `${(onchain.network.transactionCount / 1e9).toFixed(1)}B`
                : '—'
            }
          />
        </div>
      )}
      {onchain.protocols.length > 0 && (
        <div className="space-y-2">
          {onchain.protocols.map((p, i) => (
            <div
              key={i}
              className="border p-3 grid grid-cols-[1fr_auto_auto_auto] gap-3 items-baseline"
              style={{ borderColor: 'rgba(0,255,65,0.15)' }}
            >
              <div>
                <div className="font-display text-base font-bold">{p.name}</div>
                <div className="font-mono text-[10px] uppercase text-muted">{p.category}</div>
              </div>
              <div className="font-mono text-sm text-accent">{fmt(p.tvl)}</div>
              <div className="font-mono text-xs" style={{ color: pctColor(p.change7d) }}>
                7d {pct(p.change7d)}
              </div>
              <div className="font-mono text-xs" style={{ color: pctColor(p.change30d) }}>
                30d {pct(p.change30d)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted mb-1">{label}</div>
      <div className="font-display text-base font-semibold">{value}</div>
    </div>
  )
}

function Sources({ sources }: { sources: ScoutSource[] }) {
  return (
    <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--color-border-1)' }}>
      <SectionLabel>› verified sources</SectionLabel>
      <ul className="space-y-3">
        {sources.slice(0, 8).map((s, i) => (
          <li key={i} className="text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline flex-1 truncate"
              >
                {s.title}
              </a>
              {s.trustScore != null && (
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.12em] px-1.5 py-0.5 flex-shrink-0"
                  style={{
                    color: 'var(--color-charge)',
                    border: '1px solid rgba(0,255,65,0.35)',
                  }}
                >
                  trust {s.trustScore}
                </span>
              )}
            </div>
            {s.domain && (
              <div className="font-mono text-[10px] text-muted mt-0.5">{s.domain}</div>
            )}
            <div className="text-xs text-muted mt-1">{s.snippet}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ================================================================ */
/* ATLAS — strategic plan                                            */
/* ================================================================ */
function StrategicPlan({ atlas }: { atlas: AtlasOut }) {
  return (
    <Glow>
      <div className="p-8 space-y-8">
        <div>
          <Eyebrow>// 02 ATLAS · STRATEGIC PLAN</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-[-0.02em]">
            Market plan
          </h2>
          {atlas.summary && <p className="mt-3 text-base text-ink-dim leading-relaxed">{atlas.summary}</p>}
        </div>

        {/* TAM / SAM / SOM */}
        <div
          className="grid grid-cols-3 gap-px border"
          style={{ borderColor: 'var(--color-border-1)', background: 'var(--color-border-1)' }}
        >
          {[
            ['TAM', atlas.tam],
            ['SAM', atlas.sam],
            ['SOM', atlas.som],
          ].map(([k, v]) => (
            <div key={k as string} className="bg-[var(--color-void)] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted mb-2">{k}</div>
              <div className="font-display text-3xl font-bold" style={{ color: 'var(--color-charge)' }}>
                {v || '—'}
              </div>
            </div>
          ))}
        </div>
        {atlas.marketSizingRationale && (
          <p className="text-sm text-ink-dim italic">{atlas.marketSizingRationale}</p>
        )}

        {/* Top regions */}
        {Array.isArray(atlas.topRegions) && atlas.topRegions.length > 0 && (
          <div>
            <SectionLabel>› top regions</SectionLabel>
            <div className="grid md:grid-cols-3 gap-3">
              {atlas.topRegions.map((r, i) => (
                <div key={i} className="border p-4" style={{ borderColor: 'rgba(0,255,65,0.15)' }}>
                  <div className="font-display text-lg font-bold mb-1">{r.name}</div>
                  <div className="text-xs text-ink-dim">{r.why}</div>
                </div>
              ))}
            </div>
            {atlas.launchRegion && (
              <div className="mt-3 text-xs font-mono text-accent">› launch in: {atlas.launchRegion}</div>
            )}
          </div>
        )}

        {/* Customer segments */}
        {Array.isArray(atlas.customerSegments) && atlas.customerSegments.length > 0 && (
          <div>
            <SectionLabel>› customer segments</SectionLabel>
            <div className="space-y-3">
              {atlas.customerSegments.map((c, i) => (
                <div key={i} className="border p-4" style={{ borderColor: 'rgba(0,255,65,0.15)' }}>
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="font-display text-base font-bold uppercase">{c.tier}</div>
                    <div className="font-mono text-[10px] text-muted">{c.size}</div>
                  </div>
                  <div className="text-sm text-ink-dim mb-1">{c.description}</div>
                  <div className="text-xs font-mono text-muted">
                    › channel: <span className="text-accent">{c.acquisitionChannel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tailwinds + Headwinds */}
        {((Array.isArray(atlas.tailwinds) && atlas.tailwinds.length > 0) ||
          (Array.isArray(atlas.headwinds) && atlas.headwinds.length > 0)) && (
          <div className="grid md:grid-cols-2 gap-6">
            {Array.isArray(atlas.tailwinds) && atlas.tailwinds.length > 0 && (
              <div>
                <SectionLabel>› tailwinds</SectionLabel>
                <ul className="space-y-2 text-sm text-ink">
                  {atlas.tailwinds.map((t, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-emerald-400">↑</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(atlas.headwinds) && atlas.headwinds.length > 0 && (
              <div>
                <SectionLabel>› headwinds</SectionLabel>
                <ul className="space-y-2 text-sm text-ink">
                  {atlas.headwinds.map((t, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-rose-400">↓</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <AtlasOpportunityRadar atlas={atlas} />
        <AtlasTailwindHeadwindBars atlas={atlas} />
        <AtlasRegionMap atlas={atlas} />
      </div>
    </Glow>
  )
}

/* ================================================================ */
/* ATLAS — Opportunity Radar Chart                                   */
/* ================================================================ */
function AtlasOpportunityRadar({ atlas }: { atlas: AtlasOut }) {
  const parseNum = (s?: string) => {
    if (!s) return 0
    const m = s.replace(/[^0-9.BMKbmk]/g, '')
    const num = parseFloat(m) || 0
    if (/B/i.test(s)) return num * 1000
    if (/M/i.test(s)) return num
    if (/K/i.test(s)) return num / 1000
    return num / 1_000_000
  }

  const tamVal = parseNum(atlas.tam)
  const marketSize = Math.min(10, tamVal > 0 ? Math.round(Math.log10(tamVal + 1) * 3.3) : 0)
  const growthRate = Math.min(10, (atlas.tailwinds?.length ?? 0) * 2)
  const competition = Math.min(10, 10 - Math.min(10, (atlas.headwinds?.length ?? 0) * 2))
  const accessibility = atlas.launchRegion ? 7 : 4
  const customerReadiness = Math.min(10, (atlas.customerSegments?.length ?? 0) * 2.5)
  const overall = (atlas.opportunityScore ?? 50) / 10

  const radarData = [
    { dimension: 'Market Size', value: marketSize },
    { dimension: 'Growth Rate', value: growthRate },
    { dimension: 'Competition', value: competition },
    { dimension: 'Accessibility', value: accessibility },
    { dimension: 'Cust. Readiness', value: customerReadiness },
    { dimension: 'Overall', value: overall },
  ]

  if (radarData.every((d) => d.value === 0)) return null

  return (
    <div>
      <SectionLabel>› opportunity radar</SectionLabel>
      <div className="flex justify-center">
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: '#B3ADA2', fontSize: 10, fontFamily: 'monospace' }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 10]}
              tick={{ fill: '#6B6660', fontSize: 9 }}
            />
            <Radar
              name="Opportunity"
              dataKey="value"
              stroke="#00FF41"
              fill="#00FF41"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ================================================================ */
/* ATLAS — Tailwinds vs Headwinds Bar Chart                          */
/* ================================================================ */
function AtlasTailwindHeadwindBars({ atlas }: { atlas: AtlasOut }) {
  const tailwinds = atlas.tailwinds ?? []
  const headwinds = atlas.headwinds ?? []
  if (tailwinds.length === 0 && headwinds.length === 0) return null

  const maxLen = Math.max(tailwinds.length, headwinds.length)
  const barData = Array.from({ length: maxLen }, (_, i) => ({
    index: i,
    tailwind: tailwinds[i] ? 1 : 0,
    headwind: headwinds[i] ? -1 : 0,
    tailwindLabel: tailwinds[i] || '',
    headwindLabel: headwinds[i] || '',
  }))

  const labelData: Array<{ label: string; type: 'tailwind' | 'headwind'; value: number }> = [
    ...tailwinds.map((t) => ({ label: t.length > 40 ? t.slice(0, 37) + '...' : t, type: 'tailwind' as const, value: 1 })),
    ...headwinds.map((h) => ({ label: h.length > 40 ? h.slice(0, 37) + '...' : h, type: 'headwind' as const, value: 1 })),
  ]

  return (
    <div>
      <SectionLabel>› tailwinds vs headwinds</SectionLabel>
      <ResponsiveContainer width="100%" height={Math.max(200, labelData.length * 36 + 40)}>
        <BarChart data={labelData} layout="vertical" margin={{ left: 160, right: 20, top: 10, bottom: 10 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: '#B3ADA2', fontSize: 10, fontFamily: 'monospace' }}
            width={150}
          />
          <Tooltip
            contentStyle={{ background: '#1a1d24', border: '1px solid rgba(0,255,65,0.2)', fontSize: 11 }}
            labelStyle={{ color: '#F5F5F0' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {labelData.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.type === 'tailwind' ? '#10B981' : '#EF4444'}
                fillOpacity={0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ================================================================ */
/* ATLAS — Region Map (top regions as ranked cards)                   */
/* ================================================================ */
function AtlasRegionMap({ atlas }: { atlas: AtlasOut }) {
  const regions = atlas.topRegions ?? []
  if (regions.length === 0) return null

  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32']
  const medalLabels = ['1st', '2nd', '3rd']

  return (
    <div>
      <SectionLabel>› top launch regions</SectionLabel>
      <div className="grid md:grid-cols-3 gap-3">
        {regions.slice(0, 6).map((r, i) => (
          <div
            key={i}
            className="rounded-xl p-5 relative overflow-hidden"
            style={{
              background: i < 3
                ? `linear-gradient(135deg, ${medalColors[i]}08, ${medalColors[i]}15)`
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${i < 3 ? `${medalColors[i]}44` : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {i < 3 && (
              <div
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] font-bold"
                style={{ background: `${medalColors[i]}22`, color: medalColors[i] }}
              >
                {medalLabels[i]}
              </div>
            )}
            {i >= 3 && (
              <div className="absolute top-3 right-3 font-mono text-[10px] text-muted">
                #{i + 1}
              </div>
            )}
            <div className="font-display text-lg font-bold mb-2">{r.name}</div>
            <div className="text-xs text-ink-dim pr-8">{r.why}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ================================================================ */
/* ATLAS — growth chart (TAM/SAM/SOM visual)                         */
/* ================================================================ */
function AtlasGrowthChart({ atlas }: { atlas: AtlasOut }) {
  const parseNum = (s?: string) => {
    if (!s) return 0
    const m = s.replace(/[^0-9.BMKbmk]/g, '')
    const num = parseFloat(m) || 0
    if (/B/i.test(s)) return num * 1000
    if (/M/i.test(s)) return num
    if (/K/i.test(s)) return num / 1000
    return num / 1_000_000
  }
  const tam = parseNum(atlas.tam)
  const sam = parseNum(atlas.sam)
  const som = parseNum(atlas.som)
  if (tam === 0 && sam === 0 && som === 0) return null

  const max = Math.max(tam, sam, som, 1)
  const bars = [
    { label: 'TAM', value: tam, raw: atlas.tam || '—', color: 'var(--color-charge)' },
    { label: 'SAM', value: sam, raw: atlas.sam || '—', color: '#34D399' },
    { label: 'SOM', value: som, raw: atlas.som || '—', color: '#22D3EE' },
  ]

  const segments = Array.isArray(atlas.customerSegments) ? atlas.customerSegments : []

  return (
    <Glow>
      <div className="p-8">
        <Eyebrow>// ATLAS · MARKET OPPORTUNITY</Eyebrow>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-display text-xl font-bold mb-6">Market sizing</h3>
            <div className="space-y-4">
              {bars.map((b) => (
                <div key={b.label}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                      {b.label}
                    </span>
                    <span className="font-display text-lg font-bold" style={{ color: b.color }}>
                      {b.raw}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(4, (b.value / max) * 100)}%`,
                        background: b.color,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {atlas.opportunityScore != null && (
              <div className="mt-6 flex items-baseline gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                  opportunity
                </span>
                <span
                  className="font-display text-3xl font-bold"
                  style={{
                    color:
                      atlas.opportunityScore >= 70
                        ? '#00FF41'
                        : atlas.opportunityScore >= 40
                        ? '#FBBF24'
                        : '#FB7185',
                  }}
                >
                  {atlas.opportunityScore}
                </span>
                <span className="font-mono text-xs text-muted">/ 100</span>
              </div>
            )}
          </div>

          {segments.length > 0 && (
            <div>
              <h3 className="font-display text-xl font-bold mb-6">Customer segments</h3>
              <div className="space-y-3">
                {segments.map((seg, i) => (
                  <div
                    key={i}
                    className="p-3 rounded"
                    style={{
                      background:
                        seg.tier === 'early adopters'
                          ? 'rgba(0,255,65,0.06)'
                          : seg.tier === 'early majority'
                          ? 'rgba(34,211,238,0.06)'
                          : 'rgba(168,85,247,0.06)',
                      border: `1px solid ${
                        seg.tier === 'early adopters'
                          ? 'rgba(0,255,65,0.2)'
                          : seg.tier === 'early majority'
                          ? 'rgba(34,211,238,0.2)'
                          : 'rgba(168,85,247,0.2)'
                      }`,
                    }}
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-accent">
                        {seg.tier}
                      </span>
                      <span className="font-mono text-[10px] text-muted">{seg.size}</span>
                    </div>
                    <div className="text-sm text-ink-dim">{seg.description}</div>
                    <div className="text-[10px] text-muted mt-1">
                      channel: <span className="text-accent">{seg.acquisitionChannel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Glow>
  )
}

/* ================================================================ */
/* PIVOT PANEL (auto-generated when opportunity < 50)                */
/* ================================================================ */
function PivotPanel({ pivots }: { pivots: PivotIdea[] }) {
  return (
    <Glow>
      <div className="p-8">
        <Eyebrow>// AUTO-PIVOT · OPPORTUNITY BELOW THRESHOLD</Eyebrow>
        <h2 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-[-0.02em] mb-3">
          5 directions that escape this market
        </h2>
        <p className="text-sm text-ink-dim leading-relaxed mb-6 max-w-3xl">
          Atlas flagged this opportunity as weak, so the Pivot engine auto-fired 5 ranked
          alternatives — each with a revised ICP, a new core feature, and an honest score.
        </p>
        <div className="space-y-3">
          {pivots.map((p, i) => (
            <div
              key={i}
              className="border p-5 grid md:grid-cols-[auto_1fr_auto] gap-4 items-start"
              style={{ borderColor: 'rgba(0,255,65,0.15)' }}
            >
              <div className="font-mono text-xs text-accent pt-1">#{p.rank}</div>
              <div>
                <div className="font-display text-lg font-bold mb-1">{p.pivotIdea}</div>
                <div className="text-xs text-ink-dim mb-1">
                  <span className="text-muted">target:</span> {p.newTargetMarket}
                </div>
                <div className="text-xs text-ink-dim mb-1">
                  <span className="text-muted">killer feature:</span> {p.newCoreFeature}
                </div>
                <div className="text-xs text-ink-dim italic mt-2">{p.whyLessCompetition}</div>
              </div>
              <div className="text-right min-w-[80px]">
                <div
                  className="font-display text-2xl font-bold"
                  style={{ color: 'var(--color-charge)' }}
                >
                  {p.estimatedScore}/10
                </div>
                {p.marketSizeEst && (
                  <div className="font-mono text-[10px] text-muted mt-1">{p.marketSizeEst}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Glow>
  )
}

/* ================================================================ */
/* DECK / FORGE / CONNECT summary cards                              */
/* ================================================================ */
function DeckCard({ deck }: { deck: DeckOut }) {
  return (
    <Glow compact>
      <div className="p-6 h-full flex flex-col">
        <Eyebrow>// DECK</Eyebrow>
        <h3 className="font-display text-2xl font-bold tracking-tight mb-1">
          {deck.startupName || 'Pitch deck'}
        </h3>
        <div className="text-sm text-ink-dim mb-4">
          {deck.slides?.length || 0} slides · real .pptx
        </div>
        {deck.oneLiner && (
          <p className="italic text-sm text-ink-dim mb-6 line-clamp-3">“{deck.oneLiner}”</p>
        )}
        <div className="mt-auto">
          {deck.pptxUrl ? (
            <a href={deck.pptxUrl} download target="_blank" rel="noreferrer" className="btn w-full justify-center">
              Download .pptx ↓
            </a>
          ) : (
            <div className="text-xs text-muted font-mono">› deck not generated</div>
          )}
        </div>
      </div>
    </Glow>
  )
}

function ForgeCard({ forge }: { forge: ForgeOut }) {
  const stackLen = Array.isArray(forge.techStack) ? forge.techStack.length : 0
  const featLen = Array.isArray(forge.mvpFeatures) ? forge.mvpFeatures.length : 0
  return (
    <Glow compact>
      <div className="p-6 h-full flex flex-col">
        <Eyebrow>// FORGE</Eyebrow>
        <h3 className="font-display text-2xl font-bold tracking-tight mb-1">MVP scaffold</h3>
        <div className="text-sm text-ink-dim mb-2">
          {stackLen} layers · {featLen} features
        </div>
        {forge.buildabilityScore != null && (
          <div className="font-mono text-[11px] text-accent mb-4">
            buildability {forge.buildabilityScore}/100
          </div>
        )}
        {Array.isArray(forge.techStack) && forge.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {forge.techStack.map((t, i) => {
              const label = typeof t === 'string' ? t : t?.technology
              if (!label) return null
              return (
                <span
                  key={i}
                  className="font-mono text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 text-ink-dim"
                  style={{ background: 'rgba(0,255,65,0.06)', border: '1px solid rgba(0,255,65,0.18)' }}
                >
                  {label}
                </span>
              )
            })}
          </div>
        )}
        <div className="mt-auto">
          {forge.repoUrl ? (
            <a href={forge.repoUrl} target="_blank" rel="noreferrer" className="btn w-full justify-center">
              Open GitHub repo ↗
            </a>
          ) : forge.zipUrl ? (
            <>
              <a href={forge.zipUrl} download className="btn w-full justify-center">
                Download scaffold .zip ↓
              </a>
              <div
                className="mt-4 p-4 rounded text-xs text-ink-dim leading-relaxed space-y-2"
                style={{ background: 'rgba(0,255,65,0.04)', border: '1px solid rgba(0,255,65,0.12)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent mb-2">
                  › how to use this scaffold
                </div>
                <p><strong>1.</strong> Download and unzip the file (double-click the .zip)</p>
                <p><strong>2.</strong> Create a new <strong>empty</strong> GitHub repo at <a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-accent hover:underline">github.com/new</a> — name it anything, but <strong>don't</strong> add a README or .gitignore (those are already in the scaffold)</p>
                <p><strong>3.</strong> Open Terminal (search "Terminal" in Spotlight) and paste these commands one at a time. Replace YOUR_FOLDER_NAME, YOUR_USERNAME, and YOUR_REPO:</p>
                <pre className="font-mono text-[10px] text-ink p-2 rounded mt-1 overflow-x-auto" style={{ background: 'rgba(0,0,0,0.3)' }}>
{`cd ~/Downloads/YOUR_FOLDER_NAME
git init
git add .
git commit -m "forge: initial scaffold"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main`}
                </pre>
                <p><strong>4.</strong> Install dependencies and start the dev server:</p>
                <pre className="font-mono text-[10px] text-ink p-2 rounded mt-1 overflow-x-auto" style={{ background: 'rgba(0,0,0,0.3)' }}>
{`npm install
npm run dev`}
                </pre>
                <p className="text-muted italic">The BLUEPRINT.md file inside has the full architecture + roadmap.</p>
              </div>
            </>
          ) : (
            <div className="text-xs text-muted font-mono">› scaffold not generated</div>
          )}
        </div>
      </div>
    </Glow>
  )
}

function ConnectSummaryCard({ connect }: { connect: ConnectOut }) {
  const count = connect.topVCs?.length || 0
  return (
    <Glow compact>
      <div className="p-6 h-full flex flex-col">
        <Eyebrow>// CONNECT</Eyebrow>
        <h3 className="font-display text-2xl font-bold tracking-tight mb-1">VC outreach</h3>
        <div className="text-sm text-ink-dim mb-2">{count} matched · drafts ready</div>
        {connect.investorReadinessScore != null && (
          <div className="font-mono text-[11px] text-accent mb-2">
            readiness {connect.investorReadinessScore}/100
          </div>
        )}
        {connect.fundraisingStrategy && (
          <div className="text-xs text-ink-dim mb-4">
            raise <span className="text-accent">{connect.fundraisingStrategy.amount}</span> at{' '}
            {connect.fundraisingStrategy.valuationRange}
          </div>
        )}
        {connect.ideaTags && connect.ideaTags.length > 0 && (
          <div className="flex flex-wrap gap-1 text-[10px] font-mono text-muted">
            {connect.ideaTags.map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </div>
        )}
        <div className="mt-auto pt-4 text-xs text-ink-dim">› scroll down to send</div>
      </div>
    </Glow>
  )
}

/* ================================================================ */
/* FORGE deep blueprint                                              */
/* ================================================================ */
function ForgeBlueprint({ forge }: { forge: ForgeOut }) {
  return (
    <Glow>
      <div className="p-8 space-y-8">
        <div>
          <Eyebrow>// 03 FORGE · TECHNICAL BLUEPRINT</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-[-0.02em]">
            Build plan
          </h2>
          {forge.shortPitch && <p className="mt-3 text-base text-ink-dim leading-relaxed">{forge.shortPitch}</p>}
        </div>

        {Array.isArray(forge.techStack) && forge.techStack.length > 0 && (
          <div>
            <SectionLabel>› tech stack</SectionLabel>
            <div className="grid md:grid-cols-2 gap-3">
              {forge.techStack.map((t, i) => {
                const technology = typeof t === 'string' ? t : t?.technology
                const layer = typeof t === 'string' ? '' : t?.layer
                const justification = typeof t === 'string' ? '' : t?.justification
                return (
                  <div key={i} className="border p-4" style={{ borderColor: 'rgba(0,255,65,0.15)' }}>
                    <div className="flex items-baseline justify-between mb-1">
                      <div className="font-display text-lg font-bold">{technology}</div>
                      {layer && <div className="font-mono text-[10px] uppercase text-muted">{layer}</div>}
                    </div>
                    {justification && <div className="text-xs text-ink-dim">{justification}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {Array.isArray(forge.mvpFeatures) && forge.mvpFeatures.length > 0 && (
          <div>
            <SectionLabel>› mvp features</SectionLabel>
            <div className="space-y-3">
              {forge.mvpFeatures.map((f, i) => (
                <div key={i} className="border p-4" style={{ borderColor: 'rgba(0,255,65,0.15)' }}>
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="font-display text-base font-bold">{f.name}</div>
                    <div className="font-mono text-[10px] text-muted">
                      {f.complexity} · ~{f.estimateDays}d
                    </div>
                  </div>
                  <div className="text-xs text-ink-dim italic">{f.userStory}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {forge.architecture &&
          ((Array.isArray(forge.architecture.modules) && forge.architecture.modules.length > 0) ||
            (Array.isArray(forge.architecture.apiEndpoints) && forge.architecture.apiEndpoints.length > 0)) && (
          <div>
            <SectionLabel>› architecture</SectionLabel>
            {forge.architecture.dataFlow && (
              <p className="text-sm text-ink-dim mb-4 italic">{forge.architecture.dataFlow}</p>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              {Array.isArray(forge.architecture.modules) && forge.architecture.modules.length > 0 && (
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted mb-2">modules</div>
                  <ul className="text-xs space-y-1.5">
                    {forge.architecture.modules.map((m, i) => (
                      <li key={i}>
                        <span className="text-accent font-mono">{m.name}</span>{' '}
                        <span className="text-ink-dim">— {m.responsibility}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(forge.architecture.apiEndpoints) && forge.architecture.apiEndpoints.length > 0 && (
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted mb-2">endpoints</div>
                  <ul className="text-xs space-y-1.5 font-mono">
                    {forge.architecture.apiEndpoints.map((e, i) => (
                      <li key={i}>
                        <span className="text-accent">{e.method}</span> <span className="text-ink">{e.path}</span>
                        <div className="text-muted pl-1">{e.description}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {Array.isArray(forge.buildRoadmap) && forge.buildRoadmap.length > 0 && (
          <div>
            <SectionLabel>› 12-week roadmap</SectionLabel>
            <div className="space-y-3">
              {forge.buildRoadmap.map((p, i) => (
                <div key={i} className="border p-4" style={{ borderColor: 'rgba(0,255,65,0.15)' }}>
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="font-display text-base font-bold">{p.weeks}</div>
                    <div className="font-mono text-[10px] text-muted">{p.goal}</div>
                  </div>
                  <ul className="text-xs text-ink-dim space-y-1">
                    {(p.deliverables || []).map((d, j) => (
                      <li key={j}>
                        <span className="text-accent">›</span> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(forge.cutList) && forge.cutList.length > 0 && (
          <div>
            <SectionLabel>› explicitly NOT building</SectionLabel>
            <ul className="text-xs text-ink-dim space-y-1">
              {forge.cutList.map((c, i) => (
                <li key={i}>
                  <span className="text-rose-400">✕</span> {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Download + setup instructions */}
        <div
          className="rounded-lg p-6 space-y-4"
          style={{ background: 'rgba(0,255,65,0.04)', border: '1px solid rgba(0,255,65,0.18)' }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-1">
            › get your scaffold running
          </div>

          {forge.repoUrl ? (
            <div className="space-y-3">
              <a
                href={forge.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="btn inline-flex items-center gap-2"
              >
                Open GitHub repo ↗
              </a>
              <p className="text-sm text-ink-dim">
                Your repo is live. Clone it and start building:
              </p>
              <pre
                className="font-mono text-[11px] text-ink p-4 rounded overflow-x-auto leading-relaxed"
                style={{ background: 'rgba(0,0,0,0.4)' }}
              >
{`git clone ${forge.repoUrl}.git
cd ${forge.repoUrl.split('/').pop() || 'my-project'}
npm install
npm run dev`}
              </pre>
            </div>
          ) : forge.zipUrl ? (
            <div className="space-y-3">
              <a href={forge.zipUrl} download className="btn inline-flex items-center gap-2">
                Download scaffold .zip ↓
              </a>
              <p className="text-sm text-ink-dim">
                Your MVP scaffold is ready. Follow these steps to set it up:
              </p>
              <div className="space-y-3 text-sm text-ink-dim">
                <div className="flex gap-3">
                  <span className="font-mono text-accent flex-shrink-0">01</span>
                  <span>
                    <strong className="text-ink">Download and unzip</strong> the file into a new folder
                  </span>
                </div>
                <div className="flex gap-3">
                  <span className="font-mono text-accent flex-shrink-0">02</span>
                  <span>
                    <strong className="text-ink">Create a new GitHub repo</strong> at{' '}
                    <a
                      href="https://github.com/new"
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline"
                    >
                      github.com/new
                    </a>{' '}
                    — pick any name, keep it public, <em>don't</em> add a README (one is already inside)
                  </span>
                </div>
                <div className="flex gap-3">
                  <span className="font-mono text-accent flex-shrink-0">03</span>
                  <span>
                    <strong className="text-ink">Open Terminal</strong> (search "Terminal" in Spotlight) and paste these commands one at a time. Replace the placeholders with your folder path and GitHub details:
                  </span>
                </div>
              </div>
              <pre
                className="font-mono text-[11px] text-ink p-4 rounded overflow-x-auto leading-relaxed"
                style={{ background: 'rgba(0,0,0,0.4)' }}
              >
{`cd ~/Downloads/YOUR_FOLDER_NAME
git init
git add .
git commit -m "forge: initial MVP scaffold"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main`}
              </pre>
              <div className="space-y-3 text-sm text-ink-dim">
                <div className="flex gap-3">
                  <span className="font-mono text-accent flex-shrink-0">04</span>
                  <span>
                    <strong className="text-ink">Install dependencies and start the dev server:</strong>
                  </span>
                </div>
              </div>
              <pre
                className="font-mono text-[11px] text-ink p-4 rounded overflow-x-auto leading-relaxed"
                style={{ background: 'rgba(0,0,0,0.4)' }}
              >
{`npm install
npm run dev`}
              </pre>
              <p className="text-xs text-muted italic">
                Read <strong>BLUEPRINT.md</strong> inside the scaffold for the full architecture,
                data flow, API endpoints, and 12-week build roadmap.
              </p>
            </div>
          ) : (
            <div className="text-sm text-muted">Scaffold not generated yet.</div>
          )}
        </div>
      </div>
    </Glow>
  )
}

/* ================================================================ */
/* DECK slides                                                       */
/* ================================================================ */
function DeckSlides({ deck, reportId }: { deck: DeckOut; reportId: string }) {
  const slides = Array.isArray(deck.slides) ? deck.slides : []
  const hasContent = slides.some(
    (s) => (s?.title && s.title.length > 0) || (Array.isArray(s?.content) && s.content.length > 0),
  )
  const theme = deck.theme || {}
  const bg = theme.bgColor || '#0C0F15'
  const panel = theme.panelColor || 'rgba(255,255,255,0.03)'
  const ink = theme.inkColor || '#F5F5F0'
  const inkDim = theme.inkDimColor || 'rgba(255,255,255,0.55)'
  const accent = theme.accentColor || '#00FF41'
  const accentSoft = theme.accentSoftColor || 'rgba(0,255,65,0.25)'
  const fontDisplay = theme.fontDisplay || 'Barlow Condensed'
  const fontBody = theme.fontBody || 'Inter'

  const [regen, setRegen] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const regenerate = async () => {
    setRegen('running')
    try {
      await api.regenerate(reportId, 'deck')
      setRegen('done')
    } catch {
      setRegen('error')
    }
  }

  return (
    <div
      className="rounded-[14px] p-8 relative"
      style={{
        background: bg,
        color: ink,
        fontFamily: `${fontBody}, system-ui, sans-serif`,
        border: `1px solid ${accentSoft}`,
        boxShadow: `0 0 60px ${accentSoft}`,
      }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div
            className="font-mono text-[10px] uppercase tracking-[0.2em] mb-2"
            style={{ color: accent }}
          >
            // 04 DECK · PITCH {theme.moodDescriptor ? `· ${theme.moodDescriptor}` : ''}
          </div>
          <h2
            className="text-3xl md:text-4xl font-bold tracking-[-0.01em]"
            style={{ fontFamily: `${fontDisplay}, serif`, color: ink }}
          >
            {deck.startupName || 'Pitch deck'}
          </h2>
          {deck.elevatorPitch && (
            <p className="mt-3 text-base italic max-w-3xl leading-relaxed" style={{ color: inkDim }}>
              "{deck.elevatorPitch}"
            </p>
          )}
        </div>
        <button
          onClick={regenerate}
          disabled={regen === 'running'}
          className="font-mono text-[10px] uppercase tracking-[0.15em] px-3 py-2 flex-shrink-0"
          style={{
            border: `1px solid ${accent}`,
            color: accent,
            background: 'transparent',
            opacity: regen === 'running' ? 0.6 : 1,
          }}
        >
          {regen === 'running' ? 'regenerating…' : regen === 'done' ? 'queued ✓' : 'regenerate ↻'}
        </button>
      </div>

      {!hasContent ? (
        <div
          className="mt-6 p-10 text-center rounded"
          style={{ border: `1px dashed ${accentSoft}`, background: panel }}
        >
          <div className="text-sm mb-3" style={{ color: inkDim }}>
            This deck was generated by an older version of the pipeline and has no slide copy yet.
          </div>
          <button
            onClick={regenerate}
            disabled={regen === 'running'}
            className="font-mono text-[11px] uppercase tracking-[0.15em] px-4 py-2"
            style={{ background: accent, color: bg, border: `1px solid ${accent}` }}
          >
            {regen === 'running' ? 'generating…' : 'Generate pitch deck →'}
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {slides.map((s, idx) => (
            <SlideCard
              key={s.number ?? idx}
              slide={s}
              panel={panel}
              ink={ink}
              inkDim={inkDim}
              accent={accent}
              accentSoft={accentSoft}
              fontDisplay={fontDisplay}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SlideCard({
  slide,
  panel,
  ink,
  inkDim,
  accent,
  accentSoft,
  fontDisplay,
}: {
  slide: Slide
  panel: string
  ink: string
  inkDim: string
  accent: string
  accentSoft: string
  fontDisplay: string
}) {
  return (
    <div
      className="overflow-hidden rounded"
      style={{ background: panel, border: `1px solid ${accentSoft}` }}
    >
      {slide.imageUrl && (
        <div
          className="w-full relative"
          style={{
            height: 140,
            backgroundImage: `url(${slide.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: `linear-gradient(180deg, transparent 40%, ${panel})` }}
          />
        </div>
      )}
      <div className="p-4">
        <div
          className="font-mono text-[9px] uppercase tracking-[0.18em] mb-1"
          style={{ color: accent }}
        >
          {slide.section}
        </div>
        <div
          className="text-lg font-bold mb-3"
          style={{ fontFamily: `${fontDisplay}, serif`, color: ink }}
        >
          {slide.title}
        </div>
        {Array.isArray(slide.content) && slide.content.length > 0 && (
          <ul className="text-xs space-y-1" style={{ color: inkDim }}>
            {slide.content.map((c, j) => (
              <li key={j}>
                <span style={{ color: accent }}>›</span> {c}
              </li>
            ))}
          </ul>
        )}
        {slide.imageCredit && (
          <div className="mt-3 text-[9px] italic font-mono" style={{ color: inkDim }}>
            {slide.imageCredit}
          </div>
        )}
      </div>
    </div>
  )
}

/* ================================================================ */
/* INVESTOR LIST with send buttons                                   */
/* ================================================================ */
function InvestorList({ investors, reportId }: { investors: ConnectInvestor[]; reportId: string }) {
  const [sentMap, setSentMap] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({})
  const [errorMap, setErrorMap] = useState<Record<string, string>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [ranked, setRanked] = useState<ConnectInvestor[] | null>(null)

  // Poll the ranked endpoint every 15s — picks up live SendGrid webhook events
  useEffect(() => {
    let stop = false
    const tick = async () => {
      try {
        const r = await api.getRankedInvestors(reportId)
        if (!stop && Array.isArray(r.ranked)) setRanked(r.ranked as ConnectInvestor[])
      } catch {
        // fall back to static list
      }
    }
    tick()
    const h = setInterval(tick, 15_000)
    return () => {
      stop = true
      clearInterval(h)
    }
  }, [reportId])

  const displayList = ranked && ranked.length > 0 ? ranked : investors

  const send = async (vcId: string) => {
    setSentMap((m) => ({ ...m, [vcId]: 'sending' }))
    setErrorMap((m) => ({ ...m, [vcId]: '' }))
    try {
      const res = await fetch('/api/investors/outreach', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${localStorage.getItem('ac_token')}`,
        },
        body: JSON.stringify({ reportId, vcId }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      setSentMap((m) => ({ ...m, [vcId]: 'sent' }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'send failed'
      setSentMap((m) => ({ ...m, [vcId]: 'error' }))
      setErrorMap((m) => ({ ...m, [vcId]: msg }))
    }
  }

  return (
    <Glow>
      <div className="p-8">
        <Eyebrow>// 05 CONNECT · MATCHED INVESTORS</Eyebrow>
        <h2 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-[-0.02em] mb-6">
          Ready to send
        </h2>

        <div className="space-y-3">
          {displayList.map((inv) => {
            const sentState = sentMap[inv.id] || 'idle'
            const isOpen = openId === inv.id
            const eng = inv.engagement || null
            const effective = inv.effectiveScore ?? inv.compatibilityScore ?? 50
            return (
              <div key={inv.id} className="border" style={{ borderColor: 'rgba(0,255,65,0.18)' }}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-xl font-bold">{inv.firm}</div>
                      <div className="text-sm text-ink-dim">{inv.name}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-sm" style={{ color: 'var(--color-charge)' }}>
                        {effective}%
                      </div>
                      {eng && eng.bonus !== 0 && (
                        <div
                          className="font-mono text-[10px]"
                          style={{ color: eng.bonus > 0 ? '#2ECC71' : '#FB7185' }}
                        >
                          {eng.bonus > 0 ? '+' : ''}{eng.bonus} eng
                        </div>
                      )}
                      <div className="font-mono text-[10px] text-muted">{inv.checkSize}</div>
                    </div>
                  </div>

                  {inv.thesisMatch && (
                    <div className="text-xs text-ink-dim italic mb-3">{inv.thesisMatch}</div>
                  )}

                  {eng && eng.stages.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-3">
                      {eng.stages
                        .filter((s) => {
                          if (eng.bouncedAt && (s === 'opened' || s === 'clicked')) return false
                          return true
                        })
                        .map((s, i) => {
                        const stageColor =
                          s === 'clicked' ? { bg: 'rgba(0,255,65,0.12)', text: '#00FF41' }
                          : s === 'opened' ? { bg: 'rgba(251,191,36,0.12)', text: '#FBBF24' }
                          : s === 'bounced' ? { bg: 'rgba(251,113,133,0.12)', text: '#FB7185' }
                          : s === 'delivered' ? { bg: 'rgba(46,204,113,0.12)', text: '#2ECC71' }
                          : { bg: 'rgba(0,255,65,0.08)', text: 'rgba(0,255,65,0.7)' }
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] px-2 py-1 rounded-full"
                            style={{ background: stageColor.bg, color: stageColor.text }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: stageColor.text }}
                            />
                            {s}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setOpenId(isOpen ? null : inv.id)}
                      className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-dim hover:text-accent px-2 py-1.5"
                    >
                      {isOpen ? 'hide draft' : 'view draft'}
                    </button>
                    <button
                      onClick={() => send(inv.id)}
                      disabled={sentState === 'sending' || sentState === 'sent'}
                      className="font-mono text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 rounded transition-all"
                      style={{
                        background: sentState === 'sent' ? 'rgba(0,255,65,0.15)' : 'var(--color-charge)',
                        color: sentState === 'sent' ? 'var(--color-charge)' : 'var(--color-void)',
                        border: '1px solid var(--color-charge)',
                        opacity: sentState === 'sending' || sentState === 'sent' ? 0.7 : 1,
                      }}
                    >
                      {sentState === 'sending'
                        ? 'sending…'
                        : sentState === 'sent'
                        ? 'sent ✓'
                        : sentState === 'error'
                        ? 'retry'
                        : 'send →'}
                    </button>
                  </div>
                </div>
                {sentState === 'error' && (
                  <div className="px-5 pb-3 text-[10px] text-ink-dim font-mono">› {errorMap[inv.id]}</div>
                )}
                {isOpen && (
                  <div
                    className="px-5 pb-5 pt-1 border-t font-mono text-xs text-ink-dim space-y-3"
                    style={{ borderColor: 'rgba(0,255,65,0.15)' }}
                  >
                    <div>
                      <span className="text-muted">to:</span> {inv.email}
                    </div>
                    <div>
                      <span className="text-muted">subject:</span>{' '}
                      <span className="text-ink">{inv.draftEmail?.subject}</span>
                    </div>
                    <div
                      className="whitespace-pre-line text-ink leading-relaxed pt-2 border-t"
                      style={{ borderColor: 'rgba(0,255,65,0.10)' }}
                    >
                      {inv.draftEmail?.body}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Glow>
  )
}

/* ================================================================ */
/* Shared primitives                                                 */
/* ================================================================ */
function Glow({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <BorderGlow
      backgroundColor="#0C0F15"
      borderRadius={compact ? 12 : 14}
      glowRadius={compact ? 28 : 36}
      glowColor="120 100 50"
      colors={['#00FF41', '#34D399', '#A7F3D0']}
      edgeSensitivity={20}
    >
      {children}
    </BorderGlow>
  )
}

function SectionDivider({ num, label, sub }: { num: string; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-4 pt-4">
      <div
        className="font-mono text-[11px] font-bold px-2.5 py-1 rounded"
        style={{ background: 'rgba(0,255,65,0.12)', color: 'var(--color-charge)' }}
      >
        {num}
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-xl font-bold uppercase tracking-[0.05em] text-ink">
            {label}
          </h2>
          <div className="hidden md:block h-px flex-1" style={{ background: 'var(--color-border-1)' }} />
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted mt-0.5">
          {sub}
        </div>
      </div>
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3"
      style={{ color: 'var(--color-charge)' }}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted mb-3">
      {children}
    </div>
  )
}
