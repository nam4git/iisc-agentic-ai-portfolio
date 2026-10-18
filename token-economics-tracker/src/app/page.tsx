import Link from 'next/link'
import { PRICING_CATALOGUE } from '@/lib/pricing-catalogue'

const RESEARCH_STATS = [
  { stat: '0.15', label: 'Pearson r between token savings and cost savings', citation: 'Weinberger & Hozez, 2026' },
  { stat: '+6.8%', label: 'Billed cost rise despite 38% fewer tool-output tokens', citation: 'arXiv 2607.12161' },
  { stat: '~70%', label: 'Inference cost attributable to prompt-cache operations', citation: 'Anthropic Pricing Docs' },
]

const FEATURES = [
  {
    icon: '◈',
    title: 'Real billed cost, not token counts',
    body: 'Every log entry auto-computes the dollar amount using current provider pricing — including cache-write and cache-read tiers that raw token counts ignore.',
  },
  {
    icon: '◉',
    title: 'Cache efficiency breakdown',
    body: 'Cache operations are the single largest driver of inference cost at scale. See hit rates, write costs, and read savings side by side.',
  },
  {
    icon: '◎',
    title: 'Cost-per-successful-task (CPST)',
    body: 'Grounded in Weinberger & Hozez (2026): measure what matters — dollars per completed job, not tokens consumed.',
  },
  {
    icon: '◐',
    title: 'Cross-platform comparison',
    body: 'Track Claude, OpenAI, Gemini, Codex, Antigravity, and any future provider on a single private dashboard. Prices update when you do.',
  },
  {
    icon: '◑',
    title: 'Compression ROI analysis',
    body: 'LLMLingua and similar tools compress prompts — but longer agent trajectories can negate the savings. Nanotokens surfaces that tradeoff.',
  },
  {
    icon: '◒',
    title: 'Team and enterprise tracking',
    body: 'Enterprise tier adds an API ingestion endpoint and spend-threshold webhooks so cost governance runs automatically as AI scales.',
  },
]

const TIERS = [
  {
    name: 'Observer',
    price: 'Free',
    period: '',
    features: ['Up to 2 platforms', '30-day history', 'Basic cost dashboard', 'Manual usage entry'],
    cta: 'Get started',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Analyst',
    price: '$9',
    period: '/ month',
    features: ['Unlimited platforms', 'Full history', 'Cache & compression analytics', 'CPST metric', 'CSV export', 'Custom model pricing'],
    cta: 'Start free trial',
    href: '/signup?tier=analyst',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '$29',
    period: '/ month',
    features: ['Everything in Analyst', 'API ingestion endpoint', 'Spend-threshold webhooks', 'Priority support'],
    cta: 'Contact us',
    href: '/signup?tier=enterprise',
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight text-indigo-600">Nanotokens</span>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#research" className="hover:text-slate-900 transition-colors">Research</a>
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">Log in</Link>
            <Link
              href="/signup"
              className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-14">
        {/* HERO */}
        <section className="bg-slate-950 text-white py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs px-3 py-1 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              Grounded in peer-reviewed research
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-6">
              Your AI costs more than<br />its token count suggests.
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-2xl mx-auto">
              Token reduction and cost reduction have a Pearson correlation of just{' '}
              <span className="text-white font-semibold">r&nbsp;=&nbsp;0.15</span>.
              Nanotokens tracks real billed spend — across cache tiers, model versions, and platforms — so
              your team optimises what actually matters.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                Start tracking free
              </Link>
              <a
                href="#research"
                className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white px-6 py-3 rounded-lg transition-colors"
              >
                Read the research
              </a>
            </div>
          </div>
        </section>

        {/* RESEARCH STATS */}
        <section id="research" className="bg-slate-900 py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-slate-500 text-xs uppercase tracking-widest mb-10">
              Research findings that shaped this product
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {RESEARCH_STATS.map(({ stat, label, citation }) => (
                <div key={stat} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <div className="text-4xl font-bold text-indigo-400 mb-3 tabular">{stat}</div>
                  <p className="text-slate-300 text-sm leading-relaxed mb-3">{label}</p>
                  <p className="text-slate-500 text-xs">{citation}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 bg-slate-800 border border-slate-700 rounded-xl p-6 text-sm text-slate-300 leading-relaxed">
              <p className="mb-3">
                <strong className="text-white">The compression trap.</strong>{' '}
                Weinberger &amp; Hozez (arXiv 2607.12161) showed that aggressive tool-output compression
                cut delivered tokens by 38.4% but raised billed cost by 6.8%. Prompt-cache creation and
                reads dominate the input-side bill; compressing tool output barely touches them.
              </p>
              <p className="mb-3">
                <strong className="text-white">Trajectory inflation.</strong>{' '}
                Compression changes agent behaviour — adding retrieval, diagnosis, and test turns that offset
                local savings. LLMLingua (Jiang et al., 2023) achieves 20× prompt compression, but the
                downstream trajectory cost must be measured, not assumed away.
              </p>
              <p>
                <strong className="text-white">The right metric.</strong>{' '}
                Cost-per-successful-task (CPST) captures all of this: the billed dollars divided by the number
                of jobs completed correctly. Nanotokens surfaces CPST alongside raw token counts so you can
                tell whether an optimisation actually helped.
              </p>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="py-20 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">
              Everything your team needs to govern AI spend
            </h2>
            <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto">
              As organisations scale AI across distributed teams, token costs compound non-linearly.
              Nanotokens gives every team member a private, accurate view of what they are spending and why.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map(({ icon, title, body }) => (
                <div key={title} className="p-6 rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all">
                  <div className="text-2xl text-indigo-500 mb-3">{icon}</div>
                  <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PLATFORMS */}
        <section className="py-16 px-6 bg-slate-50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Supported platforms at launch</h2>
            <p className="text-slate-500 mb-10 text-sm">Add any future platform with custom pricing — the schema never locks you in.</p>
            <div className="flex flex-wrap justify-center gap-3">
              {PRICING_CATALOGUE.map(p => (
                <div
                  key={p.slug}
                  className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 text-sm font-medium text-slate-700"
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  {p.label}
                </div>
              ))}
              <div className="flex items-center gap-2 bg-white border border-dashed border-slate-300 rounded-full px-4 py-2 text-sm text-slate-400">
                <span>+</span> Custom
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-20 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-3">Simple, transparent pricing</h2>
            <p className="text-center text-slate-500 mb-12">We track AI costs — of course we keep our own pricing clear.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TIERS.map(tier => (
                <div
                  key={tier.name}
                  className={`rounded-xl p-6 border flex flex-col ${
                    tier.highlight
                      ? 'border-indigo-500 shadow-lg shadow-indigo-100'
                      : 'border-slate-200'
                  }`}
                >
                  {tier.highlight && (
                    <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full self-start mb-3">
                      Most popular
                    </div>
                  )}
                  <h3 className="font-bold text-slate-900 text-lg mb-1">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-3xl font-bold text-slate-900">{tier.price}</span>
                    <span className="text-slate-400 text-sm">{tier.period}</span>
                  </div>
                  <ul className="space-y-2 flex-1 mb-6">
                    {tier.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={tier.href}
                    className={`text-center text-sm font-medium py-2.5 rounded-lg transition-colors ${
                      tier.highlight
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'border border-slate-300 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA STRIP */}
        <section className="bg-indigo-600 py-16 px-6 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Start measuring what you actually spend.</h2>
          <p className="text-indigo-200 mb-8 max-w-xl mx-auto text-sm">
            Sign up with your Gmail, add your first AI platform, and log your first session in under two minutes.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-indigo-700 font-semibold px-8 py-3 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Create free account
          </Link>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 py-8 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <span className="font-medium text-slate-600">Nanotokens</span>
          <div className="flex gap-6">
            <span>Research basis: arXiv 2607.12161</span>
            <Link href="/login" className="hover:text-slate-600">Log in</Link>
            <Link href="/signup" className="hover:text-slate-600">Sign up</Link>
          </div>
          <span>© {new Date().getFullYear()} Nanotokens</span>
        </div>
      </footer>
    </div>
  )
}
