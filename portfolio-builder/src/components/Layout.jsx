import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTheme } from '../hooks/useTheme'

const NAV = [
  { href: '/',         label: 'Overview' },
  { href: '/spec',     label: 'Spec' },
  { href: '/demo',     label: 'Portfolio' },
  { href: '/pipeline', label: 'Agents' },
  { href: '/roce',     label: 'ROCE' },
]

export default function Layout({ children, title = 'EQ Portfolio Builder' }) {
  const router = useRouter()
  const { theme, toggle } = useTheme()

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-eq-bg text-eq-fg">

        {/* top bar — thin accent line */}
        <div className="h-0.5 bg-eq-acc" />

        <header className="border-b border-eq-border bg-eq-bg">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-8">
            <Link href="/" className="font-semibold text-sm text-eq-fg tracking-tight">
              EdgeQuant <span className="font-normal text-eq-fg3">Portfolio</span>
            </Link>

            <nav className="flex items-center gap-0.5">
              {NAV.map(n => {
                const active = router.pathname === n.href
                return (
                  <Link key={n.href} href={n.href}
                    className={[
                      'px-3 py-1.5 text-sm rounded transition-colors',
                      active ? 'text-eq-acc font-medium' : 'text-eq-fg2 hover:text-eq-fg',
                    ].join(' ')}>
                    {n.label}
                  </Link>
                )
              })}
            </nav>

            <div className="flex-1" />

            <button onClick={toggle}
              className="text-xs text-eq-fg3 hover:text-eq-fg2 transition-colors font-mono border border-eq-border rounded px-2.5 py-1">
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>

            <a href="https://github.com" target="_blank" rel="noopener noreferrer"
              className="text-xs text-eq-fg3 hover:text-eq-fg2 transition-colors">
              GitHub
            </a>
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
