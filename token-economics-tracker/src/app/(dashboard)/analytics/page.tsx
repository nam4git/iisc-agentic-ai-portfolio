import { createClient } from '@/lib/supabase/server'
import { formatUSD, formatTokens } from '@/lib/utils'
import AnalyticsCharts from './AnalyticsCharts'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics' }

const RESEARCH_REFS = [
  {
    title: '"Token Reduction Is Not Cost Reduction"',
    authors: 'Weinberger & Hozez',
    year: '2026',
    ref: 'arXiv 2607.12161',
    finding: 'Pearson r = 0.15 between token savings and actual cost savings. A 38.4% drop in tool-output tokens raised billed cost by 6.8%.',
  },
  {
    title: '"LLMLingua: Compressing Prompts for Accelerated Inference of LLMs"',
    authors: 'Jiang et al.',
    year: '2023',
    ref: 'EMNLP 2023',
    finding: '20× prompt compression is achievable, but downstream trajectory length must be monitored — longer agent loops can fully offset the savings.',
  },
  {
    title: '"Prompt Caching"',
    authors: 'Anthropic',
    year: '2024',
    ref: 'Anthropic Docs',
    finding: 'Cache reads cost ~10% of input-token price. A 90% cache hit rate can reduce total spend by up to 80% on long context-stable tasks.',
  },
  {
    title: '"Efficient Large Language Models: A Survey"',
    authors: 'Wan et al.',
    year: '2023',
    ref: 'arXiv 2312.03863',
    finding: 'Quantisation, KV-cache pruning, and structured pruning each address different cost axes. Combining them needs per-axis measurement — treating tokens as cost is not enough.',
  },
]

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: usage } = await supabase
    .from('usage_logs')
    .select('billed_usd, input_tokens, output_tokens, cache_create, cache_read, turns, successful, logged_at, models(name, platform_id, platforms(label, color))')
    .eq('user_id', user!.id)
    .order('logged_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (usage ?? []) as any[]
  const totalSessions = rows.length
  const successfulSessions = rows.filter(r => r.successful).length
  const totalBilled = rows.reduce((s, r) => s + (r.billed_usd ?? 0), 0)
  const cpst = successfulSessions > 0 ? totalBilled / successfulSessions : null
  const totalInput = rows.reduce((s, r) => s + (r.input_tokens ?? 0), 0)
  const totalCacheRead = rows.reduce((s, r) => s + (r.cache_read ?? 0), 0)
  const cacheHitRate = totalInput > 0 ? (totalCacheRead / totalInput) * 100 : 0
  const totalTurns = rows.reduce((s, r) => s + (r.turns ?? 1), 0)
  const avgTurnsPerSession = totalSessions > 0 ? totalTurns / totalSessions : 0

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">
          Metrics grounded in the token-economics literature — cost per task, cache efficiency, and compression tradeoffs
        </p>
      </div>

      {/* KEY METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Cost / successful task</p>
          <p className="text-2xl font-bold text-indigo-600 tabular">{cpst != null ? formatUSD(cpst) : '—'}</p>
          <p className="text-xs text-slate-400 mt-1">The paper&apos;s recommended metric</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Cache hit rate</p>
          <p className={`text-2xl font-bold tabular ${cacheHitRate > 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {cacheHitRate.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-400 mt-1">Target: &gt;50% for cost gains</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Success rate</p>
          <p className="text-2xl font-bold tabular text-slate-900">
            {totalSessions > 0 ? ((successfulSessions / totalSessions) * 100).toFixed(0) : '—'}%
          </p>
          <p className="text-xs text-slate-400 mt-1">{successfulSessions}/{totalSessions} sessions</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Avg turns / session</p>
          <p className="text-2xl font-bold tabular text-slate-900">{avgTurnsPerSession.toFixed(1)}</p>
          <p className="text-xs text-slate-400 mt-1">Higher turns inflate cost</p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="mb-8">
        <AnalyticsCharts rows={rows} />
      </div>

      {/* RESEARCH FOUNDATION */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-1">Research foundation</h2>
        <p className="text-xs text-slate-500 mb-5">
          These metrics are derived from peer-reviewed findings on LLM inference cost. Understanding them helps teams
          identify where actual savings are possible as AI usage scales.
        </p>
        <div className="space-y-4">
          {RESEARCH_REFS.map(ref => (
            <div key={ref.ref} className="flex gap-4">
              <div className="w-1 bg-indigo-300 rounded-full flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{ref.title}</p>
                <p className="text-xs text-slate-400 mb-1">{ref.authors} · {ref.year} · {ref.ref}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{ref.finding}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
