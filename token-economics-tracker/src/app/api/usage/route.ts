import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calcBilledUsd } from '@/lib/utils'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 500)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabase
    .from('usage_logs')
    .select('id, logged_at, session_label, input_tokens, output_tokens, cache_create, cache_read, turns, successful, billed_usd, models(name, platforms(label, color))')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false })
    .limit(limit)

  if (from) query = query.gte('logged_at', from)
  if (to) query = query.lte('logged_at', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    model_id, session_label, input_tokens = 0, output_tokens = 0,
    cache_create = 0, cache_read = 0, turns = 1, successful = true,
  } = body

  // Fetch model pricing to compute billed amount
  let billedUsd = body.billed_usd ?? null
  if (billedUsd == null && model_id) {
    const { data: model } = await supabase
      .from('models')
      .select('input_usd_m, output_usd_m, cache_create_m, cache_read_m')
      .eq('id', model_id)
      .single()

    if (model) {
      billedUsd = calcBilledUsd({
        inputTokens: input_tokens,
        outputTokens: output_tokens,
        cacheCreate: cache_create,
        cacheRead: cache_read,
        inputUsdM: model.input_usd_m,
        outputUsdM: model.output_usd_m,
        cacheCreateM: model.cache_create_m ?? 0,
        cacheReadM: model.cache_read_m ?? 0,
      })
    }
  }

  const { data, error } = await supabase
    .from('usage_logs')
    .insert({
      user_id: user.id,
      model_id: model_id ?? null,
      session_label: session_label ?? null,
      input_tokens,
      output_tokens,
      cache_create,
      cache_read,
      turns,
      successful,
      billed_usd: billedUsd ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data }, { status: 201 })
}
