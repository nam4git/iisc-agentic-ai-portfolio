'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SpendDataPoint } from '@/components/charts/SpendChart'

const SpendChart = dynamic(() => import('@/components/charts/SpendChart'), { ssr: false })
const CacheRateChart = dynamic(() => import('@/components/charts/CacheRateChart'), { ssr: false })

interface Props {
  platforms: Array<{ id: string; label: string; color: string }>
  userId: string
  cacheHitRate: number
  chartType?: 'spend' | 'cache'
}

export default function DashboardCharts({ platforms, cacheHitRate, chartType = 'spend' }: Props) {
  const [spendData, setSpendData] = useState<SpendDataPoint[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (chartType !== 'spend' || platforms.length === 0) return

    async function load() {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)

      const { data } = await supabase
        .from('usage_logs')
        .select('logged_at, billed_usd, models(platform_id)')
        .gte('logged_at', sixMonthsAgo.toISOString())
        .order('logged_at')

      if (!data) return

      const months: Record<string, SpendDataPoint> = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
        const point: SpendDataPoint = { month: key }
        platforms.forEach(p => { point[p.label] = 0 })
        months[key] = point
      }

      for (const row of data) {
        const d = new Date(row.logged_at)
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
        if (!months[key]) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const models = (Array.isArray(row.models) ? row.models[0] : row.models) as any
        const platform = platforms.find(p => p.id === models?.platform_id)
        if (platform) {
          months[key][platform.label] = ((months[key][platform.label] as number) || 0) + (row.billed_usd ?? 0)
        }
      }

      setSpendData(Object.values(months))
    }

    load()
  }, [platforms, chartType, supabase])

  if (chartType === 'cache') {
    return <CacheRateChart hitRate={cacheHitRate} />
  }

  return <SpendChart data={spendData} platforms={platforms} />
}
