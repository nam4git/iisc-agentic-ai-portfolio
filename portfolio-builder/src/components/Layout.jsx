import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../hooks/useTheme'

const MAIN_TABS = [
  { href: '/demo',      label: 'Portfolio Builder' },
  { href: '/optimize',  label: 'Portfolio Optimiser' },
  { href: '/insurance', label: 'Portfolio Insurance' },
]

const PROJECT_ITEMS = [
  { href: '/',          label: 'Overview' },
  { href: '/spec',      label: 'Project Spec (SDD)' },
  { href: '/pipeline',  label: 'Agents' },
  { href: '/roce',      label: 'ROCE' },
  { href: '/indices',   label: 'Indices' },
]

export default function Layout({ children, title = 'EQ Portfolio Builder' }) {
  const router  = useRouter()
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setOpen(false) }, [router.pathname])

  const projectActive = PROJECT_ITEMS.some(p => p.href === router.pathname)

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-eq-bg text-eq-fg">
        {/* accent line */}
        <div className="h-0.5 bg-eq-acc" />

        <header className="border-b border-eq-border bg-eq-bg">
          {/* Brand row */}
          <div className="max-w-6xl mx-auto px-6 pt-5 pb-3 flex items-end justify-between gap-4">
            <Link href="/" className="group flex items-baseline gap-3 no-underline">
              <span className="text-4xl font-bold tracking-tight text-eq-fg leading-none">
                EdgeQuant
              </span>
              <span className="text-2xl font-light text-eq-acc leading-none">
                Portfolio
              </span>
            </Link>

            <div className="flex items-center gap-2 pb-0.5">
              <span className="text-xs text-eq-fg3 font-mono hidden sm:block">
                Agentic AI · IISc
              </span>
              <button onClick={toggle}
                className="text-xs text-eq-fg3 hover:text-eq-fg2 transition-colors font-mono border border-eq-border rounded px-2.5 py-1">
                {theme === 'light' ? 'Dark' : 'Light'}
              </button>
            </div>
          </div>

          {/* Nav row */}
          <div className="max-w-6xl mx-auto px-6 pb-0 flex items-center gap-3">
            {/* Primary tools */}
            <div className="flex items-center gap-1 bg-eq-el rounded-t-lg px-1 pt-1">
              {MAIN_TABS.map(n => {
                const active = router.pathname === n.href
                return (
                  <Link key={n.href} href={n.href}
                    className={[
                      'px-4 py-2 text-sm rounded-t-md transition-all whitespace-nowrap',
                      active
                        ? 'bg-eq-acc text-white font-medium'
                        : 'text-eq-fg2 hover:text-eq-fg hover:bg-eq-hover',
                    ].join(' ')}>
                    {n.label}
                  </Link>
                )
              })}
            </div>

            {/* separator */}
            <div className="w-px h-5 bg-eq-border shrink-0" />

            {/* Project dropdown */}
            <div className="relative pb-0" ref={ref}>
              <button
                onClick={() => setOpen(v => !v)}
                className={[
                  'flex items-center gap-1.5 px-3 py-2 text-xs rounded-t transition-colors whitespace-nowrap border-x border-t',
                  projectActive
                    ? 'border-eq-border2 text-eq-fg2 bg-eq-el font-medium'
                    : 'border-transparent text-eq-fg3 hover:text-eq-fg2 hover:border-eq-border',
                ].join(' ')}>
                Project
                <svg className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`}
                  viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {open && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-eq-card border border-eq-border rounded-lg shadow-lg z-50 py-1 overflow-hidden">
                  <div className="px-3 py-1.5 text-[10px] font-medium text-eq-fg3 uppercase tracking-widest border-b border-eq-border mb-1">
                    Background material
                  </div>
                  {PROJECT_ITEMS.map(item => {
                    const active = router.pathname === item.href
                    return (
                      <Link key={item.href} href={item.href}
                        className={[
                          'block px-3 py-2 text-sm transition-colors',
                          active
                            ? 'text-eq-acc font-medium bg-eq-el'
                            : 'text-eq-fg2 hover:text-eq-fg hover:bg-eq-hover',
                        ].join(' ')}>
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className="border-t border-eq-border mt-24 py-8">
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-eq-fg3">
            <span>EdgeQuant Portfolio Builder</span>
            <span>Specification-Driven Development · Modern Software Development · 2026</span>
          </div>
        </footer>
      </div>
    </>
  )
}
