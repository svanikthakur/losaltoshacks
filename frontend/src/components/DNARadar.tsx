import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'

/**
 * Founder DNA radar — 6 dimensions normalised to 0-10.
 */
export interface DNAData {
  skills: string[]
  riskScore: number
  networkSize: number
  hoursPerWeek: number
  priorStartups: number
  location?: string
}

export default function DNARadar({ dna }: { dna: DNAData }) {
  const technicalCount = countMatches(dna.skills, ['eng', 'code', 'dev', 'backend', 'frontend', 'ml', 'ai', 'data'])
  const designCount = countMatches(dna.skills, ['design', 'ux', 'ui', 'brand', 'product'])
  const businessCount = countMatches(dna.skills, ['sales', 'biz', 'ops', 'finance', 'legal', 'strategy'])
  const marketingCount = countMatches(dna.skills, ['marketing', 'growth', 'content', 'seo', 'community'])

  const data = [
    { axis: 'Technical', value: clamp(technicalCount * 3) },
    { axis: 'Design', value: clamp(designCount * 3) },
    { axis: 'Business', value: clamp(businessCount * 3) },
    { axis: 'Marketing', value: clamp(marketingCount * 3) },
    { axis: 'Risk', value: (dna.riskScore || 3) * 2 },
    { axis: 'Network', value: clamp((dna.networkSize || 0) / 50) },
  ]

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="rgba(0,255,65,0.18)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: 'rgba(220,255,235,0.7)', fontSize: 11, fontFamily: 'Fragment Mono, monospace' }}
        />
        <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
        <Radar
          name="DNA"
          dataKey="value"
          stroke="#00FF41"
          fill="#00FF41"
          fillOpacity={0.28}
          strokeWidth={1.6}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}

function countMatches(skills: string[], needles: string[]): number {
  return skills.filter((s) => needles.some((n) => s.toLowerCase().includes(n))).length
}
function clamp(n: number): number {
  return Math.max(0, Math.min(10, n))
}
