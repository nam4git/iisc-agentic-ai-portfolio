'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

export interface SpendDataPoint {
  month: string
  [platform: string]: string | number
}

interface Props {
  data: SpendDataPoint[]
  platforms: Array<{ label: string; color: string }>
}

export default function SpendChart({ data, platforms }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-slate-400">
        No spend data yet. Log your first usage session.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {platforms.map(p => (
            <linearGradient key={p.label} id={`grad-${p.label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={p.color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={p.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={v => `$${v.toFixed(2)}`}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          width={55}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value ?? 0).toFixed(4)}`, undefined]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {platforms.map(p => (
          <Area
            key={p.label}
            type="monotone"
            dataKey={p.label}
            stroke={p.color}
            strokeWidth={2}
            fill={`url(#grad-${p.label})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
