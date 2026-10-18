export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarLink from '@/components/SidebarLink'
import LogoutButton from '@/components/LogoutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const email = user.email ?? ''
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-60 bg-slate-900 flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-slate-800">
          <Link href="/" className="font-bold text-indigo-400 text-base tracking-tight">
            Nanotokens
          </Link>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-0.5">
          <SidebarLink href="/dashboard" icon="grid">Dashboard</SidebarLink>
          <SidebarLink href="/platforms" icon="layers">Platforms</SidebarLink>
          <SidebarLink href="/usage" icon="zap">Log Usage</SidebarLink>
          <SidebarLink href="/analytics" icon="bar-chart-2">Analytics</SidebarLink>
          <SidebarLink href="/settings" icon="settings">Settings</SidebarLink>
        </nav>

        <div className="px-4 py-4 border-t border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 truncate">{email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
