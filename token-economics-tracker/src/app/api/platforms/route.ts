import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PRICING_CATALOGUE } from '@/lib/pricing-catalogue'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('platforms')
    .select('id, label, color, slug, created_at')
    .eq('user_id', user.id)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ platforms: data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { slug, label, color } = body

  const cat = PRICING_CATALOGUE.find(p => p.slug === slug)
  const platformLabel = label || cat?.label
  const platformColor = color || cat?.color

  if (!platformLabel) return NextResponse.json({ error: 'label is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('platforms')
    .insert({ user_id: user.id, slug: slug || 'custom', label: platformLabel, color: platformColor ?? '#64748b', is_custom: !cat })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ platform: data }, { status: 201 })
}
