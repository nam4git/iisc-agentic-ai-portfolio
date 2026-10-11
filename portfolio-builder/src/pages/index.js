import Layout from '../components/Layout'
import Link from 'next/link'

export default function Home() {
  return (
    <Layout title="EQ Portfolio Builder">
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-20">

        {/* hero */}
        <div className="max-w-2xl">
          <p className="text-xs text-eq-fg3 mb-4 tracking-wide uppercase">
            Modern Software Development · CS146S
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight mb-5">
            Agentic AI Stock<br />Portfolio Builder
          </h1>
          <p className="text-base text-eq-fg2 leading-relaxed mb-8">
            A five-agent investment pipeline for NSE/BSE equities. Built using
            Specification-Driven Development — every data type, invariant, and
            agent contract was formally specified before any code was written.
          </p>
          <div className="flex gap-3">
            <Link href="/demo"
              className="inline-flex items-center px-5 py-2.5 bg-eq-acc text-white text-sm font-medium rounded hover:opacity-90 transition-opacity">
              Open Portfolio →
            </Link>
            <Link href="/spec"
              className="inline-flex items-center px-5 py-2.5 border border-eq-border text-eq-fg2 text-sm rounded hover:text-eq-fg hover:border-eq-border2 transition-colors">
              Read the Spec
            </Link>
          </div>
        </div>

        {/* build methodology */}
        <div>
          <h2 className="text-lg font-semibold mb-1">Build methodology</h2>
          <p className="text-sm text-eq-fg2 mb-6">
            Specification-Driven Development: spec written first, code derived from it.
          </p>

          <div className="border border-eq-border rounded-lg overflow-hidden">
            {[
              {
                n: '01', phase: 'Specification',
                desc: 'Formal spec written before any code: typed data model, six portfolio invariants (I1–I6), five gate conditions (G1–G5), seven safety properties (P1–P7), and typed contracts for all five agents with pre/postconditions.',
                cta: { label: 'View specification', href: '/spec' },
              },
              {
                n: '02', phase: 'Library layer',
                desc: 'src/lib/portfolio.js implements each pure function from spec §5 exactly. alloc(), weightedReturn(), sharpe(), normalise() are stateless — identical inputs always produce identical outputs. No side effects.',
                cta: null,
              },
              {
                n: '03', phase: 'Agent pipeline',
                desc: 'Five Python agents in Docker containers (FastAPI), each satisfying its spec contract. The FundManager conductor enforces gate ordering rules FM1–FM6. No agent sends broker orders — human approval required.',
                cta: { label: 'View agents', href: '/pipeline' },
              },
              {
                n: '04', phase: 'Deployment',
                desc: 'Frontend on Vercel — zero-config deploy from GitHub. Agent backends run on docker-compose locally, or Railway/AWS Fargate in production. ROCE data fetched from Yahoo Finance (NSE .NS / BSE .BO).',
                cta: null,
              },
            ].map((s, i) => (
              <div key={i}
                className="flex gap-6 px-6 py-5 border-b border-eq-border last:border-b-0 hover:bg-eq-hover transition-colors">
                <span className="font-mono text-sm text-eq-fg3 pt-0.5 w-6 flex-shrink-0">{s.n}</span>
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1.5">{s.phase}</div>
                  <p className="text-sm text-eq-fg2 leading-relaxed">{s.desc}</p>
                  {s.cta && (
                    <Link href={s.cta.href}
                      className="text-xs text-eq-acc hover:underline mt-2 inline-block">
                      {s.cta.label} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* agent pipeline table */}
        <div>
          <h2 className="text-lg font-semibold mb-1">Investment pipeline</h2>
          <p className="text-sm text-eq-fg2 mb-6">
            Sequential gate model — a candidate must pass every gate in order.
          </p>

          <div className="border border-eq-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-eq-border bg-eq-bg2 text-left">
                  <th className="px-5 py-3 font-medium text-xs text-eq-fg2 w-40">Agent</th>
                  <th className="px-5 py-3 font-medium text-xs text-eq-fg2">Responsibility</th>
                  <th className="px-5 py-3 font-medium text-xs text-eq-fg2">Gate condition</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['A1  BreakoutScanner',  'Monthly breakout scan across NSE/BSE universe',       'G1: close > resistance, vol ≥ 1.5×, age ≥ 3m'],
                  ['A2  ROCEAgent',        'ROCE time-series, peer percentile, registry',          'G2: ROCE > 15% improving, or peer ≥ 60th'],
                  ['A3  MPEntryAgent',     'Market Profile entry, stop, averaging levels',         'G3: entry at VAL/POC; stop at IB low'],
                  ['A4  PortfolioManager', 'Ongoing PnL attribution, stop trail, alerts',          'Continuous: stop monotonicity (P5)'],
                  ['A5  ResearchAnalytics','Weekly expectancy, benchmark, ROCE drift detection',   'Weekly: triggers A2 re-check on drift'],
                  ['FM  FundManager',      'Orchestrator — fiduciary duty to Owner',               'FM1–FM6: sequence + approval enforcer'],
                ].map(([a, r, g]) => (
                  <tr key={a} className="tr-fin">
                    <td className="px-5 py-3 font-mono text-xs text-eq-fg2 whitespace-nowrap">{a}</td>
                    <td className="px-5 py-3 text-eq-fg">{r}</td>
                    <td className="px-5 py-3 font-mono text-xs text-eq-fg2">{g}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-eq-fg3 mt-2">
            Safety P1: no agent sends broker orders. Execution requires explicit Owner approval.
          </p>
        </div>

        {/* stack */}
        <div>
          <h2 className="text-lg font-semibold mb-6">Technology</h2>
          <div className="grid sm:grid-cols-2 gap-0 border border-eq-border rounded-lg overflow-hidden">
            {[
              ['Frontend',        'Next.js 14, Tailwind CSS, Vercel'],
              ['Agent runtime',   'Python 3.12, FastAPI, Docker'],
              ['Market data',     'Yahoo Finance (NSE .NS / BSE .BO)'],
              ['Persistence',     'SQLite — append-only ROCE registry, audit log'],
              ['Orchestration',   'docker-compose (dev) · Railway / Fargate (prod)'],
              ['AI layer',        'Claude — FundManager decision core'],
            ].map(([k, v], i) => (
              <div key={k}
                className={`flex gap-4 px-5 py-3.5 text-sm border-eq-border hover:bg-eq-hover transition-colors
                  ${i % 2 === 0 ? 'border-b sm:border-b-0 sm:border-r' : 'border-b'}
                  ${i >= 4 ? 'border-b-0' : ''}`}>
                <span className="text-eq-fg3 w-32 flex-shrink-0">{k}</span>
                <span className="text-eq-fg2">{v}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  )
}
