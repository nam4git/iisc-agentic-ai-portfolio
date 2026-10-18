import { createClient } from '@/lib/supabase/server'
import { formatUSD, formatTokens } from '@/lib/utils'
import DashboardCharts from './DashboardCharts'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

function StatTile({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-bold tabular ${accent ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch summary data
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [platformsRes, usageRes, monthUsageRes] = await Promise.all([
    supabase.from('platforms').select('id, label, color').eq('user_id', user!.id),
    supabase.from('usage_logs').select('billed_usd, cache_read, input_tokens').eq('user_id', user!.id),
    supabase.from('usage_logs').select('billed_usd, logged_at, model_id').eq('user_id', user!.id).gte('logged_at', monthStart),
  ])

  const platforms = platformsRes.data ?? []
  const allUsage = usageRes.data ?? []
  const monthUsage = monthUsageRes.data ?? []

  const monthSpend = monthUsage.reduce((s, r) => s + (r.billed_usd ?? 0), 0)
  const totalSpend = allUsage.reduce((s, r) => s + (r.billed_usd ?? 0), 0)
  const totalTokens = allUsage.reduce((s, r) => s + (r.input_tokens ?? 0), 0)
  const totalCacheRead = allUsage.reduce((s, r) => s + (r.cache_read ?? 0), 0)
  const cacheHitRate = totalTokens > 0 ? Math.min(100, (totalCacheRead / totalTokens) * 100) : 0

  // Recent usage (last 5 entries)
  const { data: recentUsage } = await supabase
    .from('usage_logs')
    .select('id, logged_at, session_label, billed_usd, input_tokens, output_tokens, models(name, platforms(label, color))')
    .eq('user_id', user!.id)
    .order('logged_at', { ascending: false })
    .limit(5)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Your AI spend at a glance</p>
      </div>

      {/* STAT TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile
          label="This month"
          value={formatUSD(monthSpend)}
          sub="billed cost"
          accent="text-indigo-600"
        />
        <StatTile
          label="All time"
          value={formatUSD(totalSpend)}
          sub="across all platforms"
        />
        <StatTile
          label="Cache hit rate"
          value={`${cacheHitRate.toFixed(1)}%`}
          sub="cache reads / input tokens"
          accent={cacheHitRate > 50 ? 'text-emerald-600' : 'text-slate-900'}
        />
        <StatTile
          label="Platforms tracked"
          value={platforms.length.toString()}
          sub={`${formatTokens(totalTokens)} tokens total`}
        />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Monthly spend by platform</h2>
          <DashboardCharts platforms={platforms} userId={user!.id} cacheHitRate={cacheHitRate} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Cache efficiency</h2>
          <p className="text-xs text-slate-400 mb-4">
            Cache reads cost ~{((0.3 / 3) * 100).toFixed(0)}% of a direct input call.
            Higher hit rates = lower spend per task.
          </p>
          <DashboardCharts platforms={platforms} userId={user!.id} cacheHitRate={cacheHitRate} chartType="cache" />
        </div>
      </div>

      {/* RECENT USAGE TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Recent sessions</h2>
          <a href="/usage" className="text-xs text-indigo-600 hover:underline">View all</a>
        </div>
        {!recentUsage || recentUsage.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            No sessions yet.{' '}
            <a href="/usage" className="text-indigo-600 hover:underline">Log your first usage</a>.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs text-slate-400 font-medium">Session</th>
                <th className="text-left px-5 py-3 text-xs text-slate-400 font-medium">Platform</th>
                <th className="text-right px-5 py-3 text-xs text-slate-400 font-medium">Input</th>
                <th className="text-right px-5 py-3 text-xs text-slate-400 font-medium">Output</th>
                <th className="text-right px-5 py-3 text-xs text-slate-400 font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {recentUsage.map((row: Record<string, unknown>) => {
                const models = row.models as Record<string, unknown> | null
                const pl = models?.platforms as Record<string, string> | null
                return (
                  <tr key={row.id as string} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-700">
                      {(row.session_label as string) || '—'}
                      <span className="block text-xs text-slate-400">
                        {new Date(row.logged_at as string).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {pl?.color && (
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pl.color }} />
                        )}
                        <span className="text-slate-600">{pl?.label ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600 tabular">{formatTokens(row.input_tokens as number)}</td>
                    <td className="px-5 py-3 text-right text-slate-600 tabular">{formatTokens(row.output_tokens as number)}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900 tabular">{formatUSD(row.billed_usd as number)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
