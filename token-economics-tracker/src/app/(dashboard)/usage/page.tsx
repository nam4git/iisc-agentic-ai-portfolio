'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PRICING_CATALOGUE } from '@/lib/pricing-catalogue'
import { calcBilledUsd, formatUSD, formatTokens } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'

interface Platform { id: string; label: string; color: string; slug: string }
interface UsageRow {
  id: string
  logged_at: string
  session_label: string
  billed_usd: number
  input_tokens: number
  output_tokens: number
  cache_create: number
  cache_read: number
  successful: boolean
  models: { name: string; platforms: { label: string; color: string } } | null
}

export default function UsagePage() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [logs, setLogs] = useState<UsageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    platformId: '',
    modelId: '',
    sessionLabel: '',
    inputTokens: '',
    outputTokens: '',
    cacheCreate: '',
    cacheRead: '',
    turns: '1',
    successful: true,
  })

  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [pRes, lRes] = await Promise.all([
      supabase.from('platforms').select('id, label, color, slug').eq('user_id', user.id),
      supabase
        .from('usage_logs')
        .select('id, logged_at, session_label, billed_usd, input_tokens, output_tokens, cache_create, cache_read, successful, models(name, platforms(label, color))')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(20),
    ])

    setPlatforms(pRes.data ?? [])
    setLogs((lRes.data as unknown as UsageRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const selectedPlatform = platforms.find(p => p.id === form.platformId)
  const catalogueModels = selectedPlatform
    ? PRICING_CATALOGUE.find(c => c.slug === selectedPlatform.slug)?.models ?? []
    : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !selectedPlatform) return

    const catalogueModel = catalogueModels.find(m => m.id === form.modelId)
    const billed = catalogueModel
      ? calcBilledUsd({
          inputTokens: Number(form.inputTokens) || 0,
          outputTokens: Number(form.outputTokens) || 0,
          cacheCreate: Number(form.cacheCreate) || 0,
          cacheRead: Number(form.cacheRead) || 0,
          inputUsdM: catalogueModel.inputUsdM,
          outputUsdM: catalogueModel.outputUsdM,
          cacheCreateM: catalogueModel.cacheCreateM,
          cacheReadM: catalogueModel.cacheReadM,
        })
      : 0

    // Find or create the model record
    let { data: modelRow } = await supabase
      .from('models')
      .select('id')
      .eq('platform_id', form.platformId)
      .eq('catalogue_id', form.modelId)
      .single()

    if (!modelRow && catalogueModel) {
      const { data } = await supabase
        .from('models')
        .insert({
          platform_id: form.platformId,
          catalogue_id: form.modelId,
          name: catalogueModel.name,
          input_usd_m: catalogueModel.inputUsdM,
          output_usd_m: catalogueModel.outputUsdM,
          cache_create_m: catalogueModel.cacheCreateM,
          cache_read_m: catalogueModel.cacheReadM,
        })
        .select('id')
        .single()
      modelRow = data
    }

    await supabase.from('usage_logs').insert({
      user_id: user.id,
      model_id: modelRow?.id ?? null,
      session_label: form.sessionLabel || null,
      input_tokens: Number(form.inputTokens) || 0,
      output_tokens: Number(form.outputTokens) || 0,
      cache_create: Number(form.cacheCreate) || 0,
      cache_read: Number(form.cacheRead) || 0,
      turns: Number(form.turns) || 1,
      successful: form.successful,
      billed_usd: billed,
    })

    setSuccess(true)
    setForm({ platformId: '', modelId: '', sessionLabel: '', inputTokens: '', outputTokens: '', cacheCreate: '', cacheRead: '', turns: '1', successful: true })
    setTimeout(() => setSuccess(false), 3000)
    await load()
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Log Usage</h1>
        <p className="text-slate-500 text-sm mt-1">Record a usage session and Nanotokens calculates the billed cost automatically</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FORM */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">New session</h2>
          {success && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-700 mb-4">
              <CheckCircle2 className="w-4 h-4" />
              Session logged successfully
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Platform</label>
              <select
                value={form.platformId}
                onChange={e => setForm(f => ({ ...f, platformId: e.target.value, modelId: '' }))}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select platform…</option>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>

            {catalogueModels.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Model</label>
                <select
                  value={form.modelId}
                  onChange={e => setForm(f => ({ ...f, modelId: e.target.value }))}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select model…</option>
                  {catalogueModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Session label</label>
              <input
                type="text"
                value={form.sessionLabel}
                onChange={e => setForm(f => ({ ...f, sessionLabel: e.target.value }))}
                placeholder="e.g. Refactor auth module"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Input tokens</label>
                <input type="number" min="0" value={form.inputTokens} onChange={e => setForm(f => ({ ...f, inputTokens: e.target.value }))} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Output tokens</label>
                <input type="number" min="0" value={form.outputTokens} onChange={e => setForm(f => ({ ...f, outputTokens: e.target.value }))} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cache write tokens</label>
                <input type="number" min="0" value={form.cacheCreate} onChange={e => setForm(f => ({ ...f, cacheCreate: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cache read tokens</label>
                <input type="number" min="0" value={form.cacheRead} onChange={e => setForm(f => ({ ...f, cacheRead: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="successful" checked={form.successful} onChange={e => setForm(f => ({ ...f, successful: e.target.checked }))} className="rounded" />
              <label htmlFor="successful" className="text-xs text-slate-700">Task completed successfully (used for CPST metric)</label>
            </div>

            <button
              type="submit"
              disabled={!form.platformId || !form.modelId}
              className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Log session
            </button>
          </form>
        </div>

        {/* RECENT LOG */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Recent sessions</h2>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-400">No sessions logged yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.slice(0, 8).map(row => (
                <div key={row.id} className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-800 font-medium">{row.session_label || 'Unnamed session'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {row.models?.platforms?.color && (
                        <span className="w-2 h-2 rounded-full" style={{ background: row.models.platforms.color }} />
                      )}
                      <p className="text-xs text-slate-400">{row.models?.platforms?.label ?? '—'} · {new Date(row.logged_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular text-slate-900">{formatUSD(row.billed_usd)}</p>
                    <p className="text-xs text-slate-400 tabular">{formatTokens(row.input_tokens)} in</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
