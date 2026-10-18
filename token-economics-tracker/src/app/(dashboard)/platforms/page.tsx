'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PRICING_CATALOGUE } from '@/lib/pricing-catalogue'
import { Plus, Trash2 } from 'lucide-react'
import { formatUSD } from '@/lib/utils'

interface Platform {
  id: string
  label: string
  color: string
  slug: string
  model_count?: number
  total_spend?: number
}

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedSlug, setSelectedSlug] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('platforms')
      .select('id, label, color, slug')
      .eq('user_id', user.id)
      .order('created_at')

    setPlatforms(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addPlatform() {
    if (!selectedSlug) return
    setError('')
    const cat = PRICING_CATALOGUE.find(p => p.slug === selectedSlug)
    if (!cat) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: insertError } = await supabase.from('platforms').insert({
      user_id: user.id,
      slug: cat.slug,
      label: cat.label,
      color: cat.color,
    })

    if (insertError) {
      setError(insertError.message)
      return
    }

    setAdding(false)
    setSelectedSlug('')
    await load()
  }

  async function deletePlatform(id: string) {
    if (!confirm('Delete this platform and all its usage data?')) return
    await supabase.from('platforms').delete().eq('id', id)
    await load()
  }

  const existing = new Set(platforms.map(p => p.slug))
  const available = PRICING_CATALOGUE.filter(c => !existing.has(c.slug))

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platforms</h1>
          <p className="text-slate-500 text-sm mt-1">Manage the AI platforms you track</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add platform
        </button>
      </div>

      {/* ADD FORM */}
      {adding && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Add a platform</h3>
          <div className="flex gap-3">
            <select
              value={selectedSlug}
              onChange={e => setSelectedSlug(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a platform…</option>
              {available.map(p => (
                <option key={p.slug} value={p.slug}>{p.label}</option>
              ))}
              <option value="custom">Custom platform…</option>
            </select>
            <button
              onClick={addPlatform}
              disabled={!selectedSlug}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setSelectedSlug('') }}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-400 py-12 text-center">Loading…</div>
      ) : platforms.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-400 text-sm mb-4">No platforms added yet.</p>
          <button
            onClick={() => setAdding(true)}
            className="text-sm text-indigo-600 font-medium hover:underline"
          >
            Add your first platform
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {platforms.map(p => {
            const cat = PRICING_CATALOGUE.find(c => c.slug === p.slug)
            return (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                    <span className="font-semibold text-slate-900">{p.label}</span>
                  </div>
                  <button
                    onClick={() => deletePlatform(p.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {cat && (
                  <table className="w-full text-xs border-t border-slate-100">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-5 py-2 text-slate-400 font-medium">Model</th>
                        <th className="text-right px-4 py-2 text-slate-400 font-medium">Input /M</th>
                        <th className="text-right px-4 py-2 text-slate-400 font-medium">Output /M</th>
                        <th className="text-right px-4 py-2 text-slate-400 font-medium">Cache write /M</th>
                        <th className="text-right px-5 py-2 text-slate-400 font-medium">Cache read /M</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.models.map(m => (
                        <tr key={m.id} className="border-t border-slate-50">
                          <td className="px-5 py-2 text-slate-700 font-mono">{m.name}</td>
                          <td className="px-4 py-2 text-right tabular text-slate-600">{formatUSD(m.inputUsdM)}</td>
                          <td className="px-4 py-2 text-right tabular text-slate-600">{formatUSD(m.outputUsdM)}</td>
                          <td className="px-4 py-2 text-right tabular text-slate-600">{m.cacheCreateM > 0 ? formatUSD(m.cacheCreateM) : '—'}</td>
                          <td className="px-5 py-2 text-right tabular text-slate-600">{m.cacheReadM > 0 ? formatUSD(m.cacheReadM) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
