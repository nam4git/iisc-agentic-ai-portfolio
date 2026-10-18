'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  hitRate: number  // 0-100
}

export default function CacheRateChart({ hitRate }: Props) {
  const miss = Math.max(0, 100 - hitRate)
  const data = [
    { name: 'Cache hit', value: hitRate },
    { name: 'Cache miss', value: miss },
  ]

  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={65}
          startAngle={90}
          endAngle={-270}
          paddingAngle={2}
          dataKey="value"
        >
          <Cell fill="#6366f1" />
          <Cell fill="#e2e8f0" />
        </Pie>
        <Tooltip
          formatter={(value) => [`${Number(value ?? 0).toFixed(1)}%`, undefined]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
