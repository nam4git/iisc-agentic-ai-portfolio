'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid, Layers, Zap, BarChart2, Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  grid: LayoutGrid,
  layers: Layers,
  zap: Zap,
  'bar-chart-2': BarChart2,
  settings: Settings,
}

interface Props {
  href: string
  icon: string
  children: React.ReactNode
}

export default function SidebarLink({ href, icon, children }: Props) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')
  const Icon = ICONS[icon] ?? Layers

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        active
          ? 'bg-slate-800 text-white font-medium'
          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {children}
    </Link>
  )
}
