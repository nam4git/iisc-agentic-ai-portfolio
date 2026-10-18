import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, display_name, created_at')
    .eq('id', user!.id)
    .single()

  const tier = profile?.tier ?? 'observer'
  const TIER_LABELS: Record<string, string> = {
    observer: 'Observer (Free)',
    analyst: 'Analyst — $9/month',
    enterprise: 'Enterprise — $29/month',
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account and subscription</p>
      </div>

      {/* ACCOUNT */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Account</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Email</p>
            <p className="text-sm text-slate-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Member since</p>
            <p className="text-sm text-slate-900">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : new Date(user?.created_at ?? '').toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* SUBSCRIPTION */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Subscription</h2>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-slate-900">{TIER_LABELS[tier]}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {tier === 'observer' ? 'Up to 2 platforms, 30-day history' : 'Unlimited platforms, full history, advanced analytics'}
              </p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              tier === 'analyst' ? 'bg-indigo-100 text-indigo-700' :
              tier === 'enterprise' ? 'bg-purple-100 text-purple-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </span>
          </div>
          {tier === 'observer' && (
            <a
              href="/signup?tier=analyst"
              className="inline-block text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Upgrade to Analyst
            </a>
          )}
        </div>
      </div>

      {/* TIER CAPABILITIES */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-sm text-slate-600">
        <h3 className="font-semibold text-slate-900 mb-3 text-sm">Tier capabilities</h3>
        <div className="space-y-2">
          {[
            { feature: 'Platform tracking', observer: '2 platforms', analyst: 'Unlimited', enterprise: 'Unlimited' },
            { feature: 'Usage history', observer: '30 days', analyst: 'Full', enterprise: 'Full' },
            { feature: 'Cache analytics', observer: '—', analyst: '✓', enterprise: '✓' },
            { feature: 'CPST metric', observer: '—', analyst: '✓', enterprise: '✓' },
            { feature: 'CSV export', observer: '—', analyst: '✓', enterprise: '✓' },
            { feature: 'API ingestion', observer: '—', analyst: '—', enterprise: '✓' },
            { feature: 'Spend webhooks', observer: '—', analyst: '—', enterprise: '✓' },
          ].map(row => (
            <div key={row.feature} className="grid grid-cols-4 gap-2 text-xs">
              <span className="text-slate-500">{row.feature}</span>
              <span className={tier === 'observer' ? 'font-semibold text-slate-900' : 'text-slate-400'}>{row.observer}</span>
              <span className={tier === 'analyst' ? 'font-semibold text-slate-900' : 'text-slate-400'}>{row.analyst}</span>
              <span className={tier === 'enterprise' ? 'font-semibold text-slate-900' : 'text-slate-400'}>{row.enterprise}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
