import Layout from '../components/Layout'

const AGENTS = [
  {
    id: 'A1', name: 'BreakoutScanner', color: '#3d7ef6',
    badge: 'READ-ONLY',
    role: 'Screens NSE/BSE universe for Monthly Breakout candidates',
    input: 'universe: List<NSETicker>,  monthly_ohlcv: Map<NSETicker, List<MonthBar>>',
    output: 'List<BreakoutCandidate>  — sorted by vol_ratio desc',
    gate: [
      'monthly_close > max(high[t-lookback .. t-1])  — close above resistance',
      'vol_ratio = month_vol / avg_12m_vol  ≥ 1.5    — volume confirmation',
      'resistance_age  ≥ 3 months              — meaningful level',
    ],
    constraint: 'Never scores fundamentals. Never produces entry prices.',
    docker: 'agents/a1_breakout',
  },
  {
    id: 'A2', name: 'ROCEAgent', color: '#fb923c',
    badge: 'HARD GATE',
    role: 'ROCE time-series + peer comparison gate; maintains persistent registry',
    input: 'candidates: List<BreakoutCandidate>,  roce_registry: Map<Ticker, List<ROCERecord>>',
    output: 'qualified: List<{candidate, ROCEReport}>  where ROCEReport.verdict = PASS',
    gate: [
      'A:  latest_roce > 15%  AND  trend_4q = IMPROVING',
      'B:  peer_percentile ≥ 60  AND  latest_roce > 12%',
      'Either A or B must hold for PASS',
    ],
    constraint: 'Never fetches live prices. Registry is append-only.',
    docker: 'agents/a2_roce',
  },
  {
    id: 'A3', name: 'MPEntryAgent', color: '#34d399',
    badge: 'ADVISORY',
    role: 'Market Profile–driven entry price, stop, averaging levels, conviction score',
    input: 'qualified: List<{candidate, roce_report}>,  daily_tpo: Map<Ticker, TPOProfile>,  risk_budget: Rupees',
    output: 'List<EntryPlan>  — entry_px, stop_px, avg_levels, suggested_wt, conviction',
    gate: [
      'entry_px: VAL or POC (from Market Profile)',
      'stop_px:  IB_low or prior_month_low (whichever lower)',
      '→ HUMAN GATE: Owner approves/rejects each EntryPlan',
    ],
    constraint: 'Proposes only. Owner approval required before AddHolding.',
    docker: 'agents/a3_mp_entry',
  },
  {
    id: 'A4', name: 'PortfolioManager', color: '#a78bfa',
    badge: 'ONGOING',
    role: 'Ongoing portfolio metrics, PnL attribution, stop trail, rebalancing signals',
    input: 'portfolio: Portfolio,  live_prices: Map<Ticker, Rupees>,  trades: List<TradeRecord>',
    output: 'PortfolioReport { metrics, pnl_by_name, attribution, alerts, rebal_signals }',
    gate: [
      'STOP_TRAIL:   price > entry × 1.08  AND  stop < entry → trail up',
      'AVG_HIT:      price ≤ avg_level  AND  ROCE still passes → alert',
      'ROCE_DECAY:   latest_roce drops > 3pp → escalate to A5',
    ],
    constraint: 'Signals only. Never averages if ROCE gate fails.',
    docker: 'agents/a4_portfolio',
  },
  {
    id: 'A5', name: 'ResearchAnalytics', color: '#f472b6',
    badge: 'WEEKLY',
    role: 'Weekly PnL analytics, ROCE drift detection, benchmark vs Nifty 500',
    input: 'pnl_history: List<PnLRecord>,  portfolio,  roce_registry,  benchmark_returns',
    output: 'WeeklyReport { performance, expectancy_by_bucket, roce_alerts, setup_review }',
    gate: [
      'ROCE drift ≥ 3pp → triggers A2 re-check automatically',
      'expectancy = win_rate × avg_winner_R − (1−win_rate) × avg_loser_R',
    ],
    constraint: 'Runs weekly only. Never modifies portfolio directly.',
    docker: 'agents/a5_research',
  },
]

const SAFETY = [
  { id: 'P1', name: 'NO_AUTONOMOUS_ORDERS', desc: 'No agent sends an order. Execution is via MEA/AMP only after Owner approval.' },
  { id: 'P2', name: 'ROCE_BEFORE_ENTRY',    desc: 'A2 must return PASS before A3 is invoked. Enforced by FundManager FM1.' },
  { id: 'P3', name: 'HUMAN_GATE_ON_ENTRY',  desc: 'Every EntryPlan requires Owner approval with recorded timestamp.' },
  { id: 'P4', name: 'NO_AVG_WITHOUT_ROCE',  desc: 'Averaging requires fresh A2 re-check passing. FM4 enforces this.' },
  { id: 'P5', name: 'STOP_MONOTONICITY',    desc: 'Stops only move up (trail). New_stop > current_stop is a hard pre-condition.' },
  { id: 'P6', name: 'FIDUCIARY_AUDIT_TRAIL',desc: 'Every decision logged immutably. Append-only. FundManager signs each entry.' },
  { id: 'P7', name: 'DATA_ISOLATION',       desc: 'PFB agents never read from other EQ consoles (ERA, MEA, AMP, SAQ).' },
]

export default function Pipeline() {
  return (
    <Layout title="Agent Pipeline — EQ Portfolio Builder">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">

        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-eq-acc mb-1">Specification-Driven</div>
          <h1 className="text-2xl font-bold mb-2">5-Agent Investment Pipeline</h1>
          <p className="text-sm text-eq-fg2 max-w-2xl">
            Candidates flow from discovery to execution through five sequential gates.
            A FundManager orchestrates all agents and holds fiduciary responsibility.
            No order is ever sent without Owner approval.
          </p>
        </div>

        {/* flow */}
        <div className="space-y-3">
          {AGENTS.map((a, i) => (
            <div key={a.id}>
              {/* agent card */}
              <div className="bg-eq-card border border-eq-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-eq-border flex items-center gap-3" style={{ background: a.color + '0a' }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-bold flex-shrink-0 border"
                    style={{ borderColor: a.color + '55', background: a.color + '18', color: a.color }}
                  >
                    {a.id}
                  </div>
                  <div>
                    <div className="font-mono font-bold text-sm" style={{ color: a.color }}>{a.name}</div>
                    <div className="text-[11px] text-eq-fg2">{a.role}</div>
                  </div>
                  <div className="flex-1" />
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border"
                    style={{ borderColor: a.color + '40', background: a.color + '12', color: a.color }}>
                    {a.badge}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-blue-400/70 mb-1">Input</div>
                      <div className="font-mono text-[11px] text-eq-fg2 bg-eq-el rounded px-3 py-2 leading-relaxed">{a.input}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-green-400/70 mb-1">Output</div>
                      <div className="font-mono text-[11px] text-eq-fg2 bg-eq-el rounded px-3 py-2 leading-relaxed">{a.output}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-amber-400/70 mb-1.5">Gate Conditions</div>
                    <div className="space-y-1">
                      {a.gate.map((g, j) => (
                        <div key={j} className="flex items-start gap-2 text-[11px] font-mono text-eq-fg2">
                          <span className="text-amber-400/50 mt-px">▸</span>
                          <span>{g}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="font-bold uppercase tracking-widest text-violet-400/70">Constraint</span>
                    <span className="font-mono text-eq-fg2">{a.constraint}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-eq-fg3">
                    <span className="font-mono">🐋 {a.docker}/</span>
                  </div>
                </div>
              </div>

              {/* arrow between agents */}
              {i < AGENTS.length - 1 && (
                <div className="flex items-center gap-3 py-1 pl-4">
                  <div className="w-px h-4 bg-eq-border ml-3.5" />
                  <span className="text-[10px] font-mono text-eq-fg3">
                    {i === 2 ? '← Owner approves →' : '→ forwarded to next gate'}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* FundManager */}
          <div className="bg-gradient-to-r from-eq-card via-indigo-950/20 to-eq-card border border-indigo-900/40 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-bold border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">
                FM
              </div>
              <div>
                <div className="font-mono font-bold text-sm text-indigo-300">FundManager</div>
                <div className="text-[11px] text-eq-fg2">Master orchestrator · Fiduciary duty to Owner</div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 text-[11px] font-mono text-eq-fg2">
              {['FM1: A2 always before A3', 'FM2: A3 never to execution without Owner OK',
                'FM3: A5 triggers A2 re-check on ROCE drift', 'FM4: No averaging if A2 re-check fails',
                'FM5: Rejects EntryPlan if stop_px ≥ entry_px', 'FM6: Weekly fiduciary report to Owner'].map(r => (
                <div key={r} className="flex items-start gap-1.5">
                  <span className="text-indigo-400/50 mt-px">▸</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* safety properties */}
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-eq-acc mb-4">Safety Properties (P1–P7)</h2>
          <div className="space-y-2">
            {SAFETY.map(p => (
              <div key={p.id} className="flex gap-3 items-start bg-eq-card border border-eq-border rounded-xl px-4 py-3">
                <span className="font-mono text-[11px] font-bold text-violet-400 flex-shrink-0 w-6">{p.id}</span>
                <span className="font-mono text-xs font-bold text-eq-fg2 flex-shrink-0 min-w-0 w-52 truncate">{p.name}</span>
                <span className="text-xs text-eq-fg2">{p.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* docker architecture */}
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-eq-acc mb-4">Docker Architecture</h2>
          <div className="bg-eq-el border border-eq-border rounded-xl p-4 font-mono text-xs text-eq-fg2 overflow-x-auto leading-relaxed whitespace-pre">
{`docker/
├── docker-compose.yml       # orchestrates all containers
├── agents/
│   ├── a1_breakout/
│   │   ├── Dockerfile       # python:3.12-slim + fastapi
│   │   └── agent.py         # BreakoutScanner implementation
│   ├── a2_roce/
│   │   ├── Dockerfile
│   │   └── agent.py         # ROCEAgent + registry persistence
│   ├── a3_mp_entry/
│   │   ├── Dockerfile
│   │   └── agent.py         # MPEntryAgent — reads TPO profile
│   ├── a4_portfolio/
│   │   ├── Dockerfile
│   │   └── agent.py         # PortfolioManager — PnL attribution
│   └── a5_research/
│       ├── Dockerfile
│       └── agent.py         # ResearchAnalytics — weekly
└── fund_manager/
    ├── Dockerfile
    └── conductor.py         # FundManager — orchestrates A1–A5`}
          </div>
        </section>

      </div>
    </Layout>
  )
}
