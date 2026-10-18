import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabase
    .from('usage_logs')
    .select('billed_usd, input_tokens, output_tokens, cache_create, cache_read, turns, successful, logged_at, models(platform_id)')
    .eq('user_id', user.id)

  if (from) query = query.gte('logged_at', from)
  if (to) query = query.lte('logged_at', to)

  const { data: rows, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const r = rows ?? []
  const totalBilled = r.reduce((s, x) => s + (x.billed_usd ?? 0), 0)
  const totalInput = r.reduce((s, x) => s + (x.input_tokens ?? 0), 0)
  const totalOutput = r.reduce((s, x) => s + (x.output_tokens ?? 0), 0)
  const totalCacheCreate = r.reduce((s, x) => s + (x.cache_create ?? 0), 0)
  const totalCacheRead = r.reduce((s, x) => s + (x.cache_read ?? 0), 0)
  const totalTurns = r.reduce((s, x) => s + (x.turns ?? 1), 0)
  const successCount = r.filter(x => x.successful).length
  const cacheHitRate = totalInput > 0 ? (totalCacheRead / totalInput) * 100 : 0
  const cpst = successCount > 0 ? totalBilled / successCount : null

  return NextResponse.json({
    summary: {
      sessions: r.length,
      totalBilled,
      totalInput,
      totalOutput,
      totalCacheCreate,
      totalCacheRead,
      totalTurns,
      successCount,
      cacheHitRate,
      cpst,
    },
  })
}
