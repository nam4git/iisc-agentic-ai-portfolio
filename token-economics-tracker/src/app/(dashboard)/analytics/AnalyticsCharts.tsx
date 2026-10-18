'use client'

import dynamic from 'next/dynamic'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis
} from 'recharts'

const SpendChart = dynamic(() => import('@/components/charts/SpendChart'), { ssr: false })

interface Row {
  billed_usd: number
  input_tokens: number
  output_tokens: number
  cache_read: number
  turns: number
  successful: boolean
  logged_at: string
  models: { name: string; platform_id: string; platforms: { label: string; color: string } | { label: string; color: string }[] } | { name: string; platform_id: string; platforms: { label: string; color: string } | { label: string; color: string }[] }[] | null
}

interface Props { rows: Row[] }

export default function AnalyticsCharts({ rows }: Props) {
  // Platform breakdown
  const byPlatform: Record<string, { label: string; color: string; billed: number; tokens: number }> = {}
  for (const row of rows) {
    const modelObj = Array.isArray(row.models) ? row.models[0] : row.models
    if (!modelObj) continue
    const plRaw = modelObj.platforms
    const pl = Array.isArray(plRaw) ? plRaw[0] : plRaw
    if (!pl) continue
    const key = pl.label
    if (!byPlatform[key]) byPlatform[key] = { label: pl.label, color: pl.color, billed: 0, tokens: 0 }
    byPlatform[key].billed += row.billed_usd ?? 0
    byPlatform[key].tokens += (row.input_tokens ?? 0) + (row.output_tokens ?? 0)
  }
  const platformData = Object.values(byPlatform)

  // Scatter: turns vs cost (proxy for trajectory inflation)
  const scatterData = rows.slice(0, 50).map(r => ({
    x: r.turns ?? 1,
    y: r.billed_usd ?? 0,
    z: r.input_tokens ?? 0,
    successful: r.successful,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Platform cost breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Cost by platform</h3>
        {platformData.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={platformData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${v.toFixed(2)}`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
              <Tooltip formatter={(v) => [`$${Number(v ?? 0).toFixed(4)}`, 'Cost']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="billed" name="Billed cost" radius={[4, 4, 0, 0]}>
                {platformData.map((p, i) => (
                  <Cell key={`cell-${i}`} fill={p.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Turns vs cost scatter (trajectory inflation insight) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Turns vs. cost</h3>
        <p className="text-xs text-slate-400 mb-4">
          More turns inflate cost even when token counts stay constant — the &quot;trajectory inflation&quot; effect from Weinberger &amp; Hozez.
        </p>
        {scatterData.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="x" name="Turns" type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} label={{ value: 'Turns', position: 'insideBottom', offset: -4, fontSize: 10, fill: '#94a3b8' }} />
              <YAxis dataKey="y" name="Cost ($)" type="number" tickFormatter={v => `$${v.toFixed(3)}`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
              <ZAxis dataKey="z" range={[20, 200]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(v, n) => [String(n) === 'Cost ($)' ? `$${Number(v ?? 0).toFixed(4)}` : Number(v ?? 0), String(n ?? '')]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Scatter data={scatterData} fill="#6366f1" fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
