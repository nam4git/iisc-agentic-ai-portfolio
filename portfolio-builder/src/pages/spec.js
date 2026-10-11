import Layout from '../components/Layout'
import Link from 'next/link'

const SECTIONS = [
  {
    id: 'overview',
    title: '1. System Overview',
    content: [
      { type: 'p', text: 'The EdgeQuant Portfolio Builder (PFB) is a five-agent agentic investment system for NSE/BSE equities. It implements a sequential gate pipeline: a candidate must pass every gate in order before it becomes a holding.' },
      { type: 'p', text: 'This specification was written before any code. The implementation in lib/portfolio.js directly maps each function defined in Section 5. Agent interfaces in docker/agents/ directly map the contracts in Section 7.' },
      { type: 'props', label: 'System identity', rows: [
        ['Name', 'EdgeQuant Portfolio Builder'],
        ['Version', '0.2 (SDD)'],
        ['Universe', 'NSE/BSE equities'],
        ['Agents', '5 + FundManager orchestrator'],
        ['Execution', 'Human-gated. No autonomous orders.'],
        ['Audit trail', 'Immutable append-only log'],
      ]},
    ],
  },
  {
    id: 'types',
    title: '2. Data Types',
    content: [
      { type: 'label', text: 'Core types' },
      { type: 'code', text: `type NSETicker    = string               -- e.g. "RELIANCE", "HDFCBANK"
type Rupees       = float               -- Indian rupees
type Pct          = float               -- percentage, e.g. 14.5 means 14.5 %
type Quarter      = string              -- e.g. "Q2FY25"
type Epoch        = int                 -- unix timestamp (seconds)

type Holding = {
  ticker     : NSETicker
  weight     : float          -- raw weight (need not sum to 100)
  entry_px   : Rupees | null  -- null if not yet entered
  stop_px    : Rupees | null  -- null if no stop set
}

type Portfolio    = List<Holding>       -- ordered; no duplicate tickers

type MonthBar = {
  open   : Rupees
  high   : Rupees
  low    : Rupees
  close  : Rupees
  volume : int
  month  : string             -- "YYYY-MM"
}

type BreakoutCandidate = {
  ticker          : NSETicker
  breakout_month  : string
  resistance_px   : Rupees
  resistance_age  : int       -- months
  vol_ratio       : float     -- month_vol / avg_12m_vol
}

type ROCERecord = {
  ticker   : NSETicker
  quarter  : Quarter
  roce     : Pct
  recorded : Epoch
}

type ROCEReport = {
  ticker          : NSETicker
  latest_roce     : Pct
  trend_4q        : "IMPROVING" | "FLAT" | "DECLINING"
  peer_percentile : int       -- 0–100
  verdict         : "PASS" | "FAIL"
  reason          : string
}

type TPOProfile = {
  ticker  : NSETicker
  date    : string
  poc     : Rupees
  val     : Rupees
  vah     : Rupees
  ib_high : Rupees
  ib_low  : Rupees
}

type EntryPlan = {
  ticker       : NSETicker
  entry_px     : Rupees        -- VAL or POC
  stop_px      : Rupees        -- IB_low or prior_month_low
  avg_levels   : List<Rupees>  -- averaging down levels
  suggested_wt : float         -- % of portfolio budget
  conviction   : int           -- 1–5 score
  expiry       : Epoch         -- plan expires after N days
}

type TradeRecord = {
  id         : string
  ticker     : NSETicker
  side       : "BUY" | "SELL"
  qty        : int
  fill_px    : Rupees
  timestamp  : Epoch
  approved_by: string          -- Owner id
}`},
      { type: 'label', text: 'Report types' },
      { type: 'code', text: `type PortfolioReport = {
  metrics       : PortfolioMetrics
  pnl_by_name   : Map<NSETicker, Rupees>
  attribution   : PnLAttribution
  alerts        : List<Alert>
  rebal_signals : List<RebalSignal>
}

type PnLAttribution = {
  by_sector     : Map<string, Rupees>
  by_setup      : Map<string, Rupees>   -- breakout / avg / follow-through
  by_mp_level   : Map<string, Rupees>   -- VAL / POC / IB
  by_roce_band  : Map<string, Rupees>   -- ROCE bands
}

type WeeklyReport = {
  performance        : PortfolioMetrics
  expectancy_by_bucket: Map<string, float>
  roce_alerts        : List<ROCEAlert>
  setup_review       : List<SetupRow>
}`},
    ],
  },
  {
    id: 'invariants',
    title: '3. Portfolio Invariants',
    content: [
      { type: 'p', text: 'These must hold at all times. Any operation that would violate them is refused.' },
      { type: 'invariants', rows: [
        ['I1', 'No negative weights', '∀ h ∈ portfolio: h.weight ≥ 0'],
        ['I2', 'No duplicate tickers', '∀ i ≠ j: portfolio[i].ticker ≠ portfolio[j].ticker'],
        ['I3', 'Stop below entry', '∀ h: h.stop_px ≠ null → h.stop_px < h.entry_px'],
        ['I4', 'Averaging only lower', '∀ l ∈ avg_levels: l < entry_px'],
        ['I5', 'Weights are finite', '∀ h: isFinite(h.weight)'],
        ['I6', 'Portfolio is non-empty before metrics', '|portfolio| ≥ 1'],
      ]},
    ],
  },
  {
    id: 'gates',
    title: '4. Gate Conditions',
    content: [
      { type: 'p', text: 'All gates are sequential. Gate N cannot be entered if gate N-1 has not been passed.' },
      { type: 'gates', rows: [
        ['G1', 'Breakout Gate', 'monthly_close > resistance_px AND vol_ratio ≥ 1.5 AND resistance_age ≥ 3'],
        ['G2', 'ROCE Gate', '(roce > 15% AND trend_4q = IMPROVING) OR (peer_pct ≥ 60 AND roce > 12%)'],
        ['G3', 'Market Profile Gate', 'entry_px ∈ {VAL, POC} AND stop_px = IB_low OR prior_month_low'],
        ['G4', 'Owner Approval Gate', 'Owner has approved this EntryPlan with recorded timestamp'],
        ['G5', 'Portfolio Fit Gate', 'adding holding does not violate I1–I6'],
      ]},
    ],
  },
  {
    id: 'functions',
    title: '5. Pure Functions',
    content: [
      { type: 'p', text: 'These functions are stateless. Identical inputs always produce identical outputs. Every function in lib/portfolio.js directly implements a definition here.' },
      { type: 'code', text: `-- Weight allocation fraction
alloc : (Holding, Portfolio) → float
alloc(h, p) = h.weight / totalWeight(p)

pre:  totalWeight(p) > 0
post: result ∈ [0, 1]

-- Total raw weight sum
totalWeight : Portfolio → float
totalWeight(p) = Σ h.weight for h in p

-- Weighted portfolio return (basis: alloc-weighted)
weightedReturn : Portfolio → Pct
weightedReturn(p) = Σ alloc(h, p) × db[h.ticker].ret

-- Weighted beta
weightedBeta : Portfolio → float
weightedBeta(p) = Σ alloc(h, p) × db[h.ticker].beta

-- Weighted annualised volatility
weightedVol : Portfolio → Pct
weightedVol(p) = Σ alloc(h, p) × db[h.ticker].vol

-- Sharpe ratio (risk-free rate 7.0%)
sharpe : Portfolio → float
sharpe(p) = (weightedReturn(p) − 7.0) / weightedVol(p)

pre:  weightedVol(p) > 0

-- Normalise weights to sum to 100
normalise : Portfolio → Portfolio
normalise(p) = [ { ...h, weight: h.weight / totalWeight(p) × 100 } for h in p ]

post: totalWeight(result) = 100.0 (within ε = 0.01)

-- Validate AddHolding preconditions
validateAdd : (NSETicker, float, Portfolio) → string | null
validateAdd(t, w, p) =
  | "Ticker required"          if t = ""
  | "Unknown ticker"           if t ∉ DB
  | "Weight must be positive"  if w ≤ 0
  | "Already in portfolio"     if ∃ h ∈ p: h.ticker = t
  | null                       otherwise`},
    ],
  },
  {
    id: 'safety',
    title: '6. Safety Properties',
    content: [
      { type: 'p', text: 'These properties must hold throughout the lifetime of the system. They cannot be overridden by configuration.' },
      { type: 'props', label: 'Safety properties', rows: [
        ['P1 NO_AUTONOMOUS_ORDERS', 'No agent sends an order. Execution is via MEA/AMP after Owner approval.'],
        ['P2 ROCE_BEFORE_ENTRY', 'G2 must be passed before G3. FundManager enforces ordering via FM1.'],
        ['P3 HUMAN_GATE_ON_ENTRY', 'Every EntryPlan requires Owner approval. Approval timestamp is logged.'],
        ['P4 NO_AVG_WITHOUT_ROCE', 'Averaging at a level requires fresh A2 re-check passing G2.'],
        ['P5 STOP_MONOTONICITY', 'Stops only trail up. new_stop > current_stop is a hard precondition.'],
        ['P6 FIDUCIARY_AUDIT_TRAIL', 'Every decision logged immutably. Append-only. FundManager signs.'],
        ['P7 DATA_ISOLATION', 'PFB agents never read from other EdgeQuant consoles.'],
      ]},
    ],
  },
  {
    id: 'agents',
    title: '7. Agent Contracts',
    content: [
      { type: 'p', text: 'Each agent has a typed contract. The contract is the ground truth; the Docker implementation must satisfy it.' },
      { type: 'agent', id: 'A1', name: 'BreakoutScanner', color: '#3d7ef6',
        input: 'universe: List<NSETicker>\nmonthly_ohlcv: Map<NSETicker, List<MonthBar>>',
        output: 'List<BreakoutCandidate>',
        pre: ['|universe| ≥ 1', '∀ t: |monthly_ohlcv[t]| ≥ 12'],
        post: ['∀ c ∈ result: c.vol_ratio ≥ 1.5', '∀ c ∈ result: c.resistance_age ≥ 3', 'result sorted by vol_ratio desc'],
        constraint: 'READ-ONLY: no writes to any store. Never produces entry prices.',
      },
      { type: 'agent', id: 'A2', name: 'ROCEAgent', color: '#fb923c',
        input: 'candidates: List<BreakoutCandidate>\nroce_registry: Map<NSETicker, List<ROCERecord>>',
        output: 'qualified: List<{candidate: BreakoutCandidate, report: ROCEReport}>',
        pre: ['∀ c: c.ticker ∈ roce_registry'],
        post: ['∀ q ∈ result: q.report.verdict = "PASS"', 'roce_registry is append-only (no deletions)'],
        constraint: 'Never fetches live prices. Registry mutations are appends only.',
      },
      { type: 'agent', id: 'A3', name: 'MPEntryAgent', color: '#34d399',
        input: 'qualified: List<{candidate, roce_report}>\ndaily_tpo: Map<NSETicker, TPOProfile>\nrisk_budget: Rupees',
        output: 'List<EntryPlan>',
        pre: ['∀ q: q.candidate.ticker ∈ daily_tpo', 'risk_budget > 0'],
        post: ['∀ p ∈ result: p.entry_px ∈ {tpo.val, tpo.poc}', '∀ p ∈ result: p.stop_px < p.entry_px', '∀ l ∈ p.avg_levels: l < p.entry_px'],
        constraint: 'ADVISORY only. Owner approval required before AddHolding.',
      },
      { type: 'agent', id: 'A4', name: 'PortfolioManager', color: '#a78bfa',
        input: 'portfolio: Portfolio\nlive_prices: Map<NSETicker, Rupees>\ntrades: List<TradeRecord>',
        output: 'PortfolioReport',
        pre: ['|portfolio| ≥ 1', '∀ h: h.ticker ∈ live_prices'],
        post: ['report.metrics consistent with pure functions (Section 5)', 'stop trail alerts satisfy P5'],
        constraint: 'Signals only. Never averages if A2 re-check fails G2.',
      },
      { type: 'agent', id: 'A5', name: 'ResearchAnalytics', color: '#f472b6',
        input: 'pnl_history: List<PnLRecord>\nportfolio: Portfolio\nroce_registry: Map<NSETicker, List<ROCERecord>>\nbenchmark_returns: List<{date, ret}>',
        output: 'WeeklyReport',
        pre: ['|pnl_history| ≥ 1'],
        post: ['ROCE drift ≥ 3pp triggers FM3 (A2 re-check)', 'expectancy formula: E = wr × avg_W − (1−wr) × avg_L'],
        constraint: 'Runs WEEKLY only. Never modifies portfolio or any registry.',
      },
    ],
  },
  {
    id: 'fundmanager',
    title: '8. FundManager Rules',
    content: [
      { type: 'p', text: 'FundManager is the master orchestrator. It enforces ordering and holds fiduciary responsibility. All six rules are hard constraints, not guidelines.' },
      { type: 'code', text: `FM1: invoke(A3, q) requires A2.report(q).verdict = "PASS"
FM2: AddHolding(plan) requires Owner.approved(plan.id) = true
FM3: when A5.roce_drift(h) ≥ 3pp → invoke(A2.recheck, h)
FM4: when A4.avg_hit(h) → require A2.recheck(h).verdict = "PASS"
FM5: when A3.entry_plan(p).stop_px ≥ p.entry_px → reject(p)
FM6: weekly_report(Owner) at every Saturday 09:00 IST` },
    ],
  },
  {
    id: 'deployment',
    title: '9. Deployment Architecture',
    content: [
      { type: 'p', text: 'Frontend on Vercel (zero-config, CDN-distributed). Agent backends containerised with Docker — one container per agent. docker-compose orchestrates locally.' },
      { type: 'props', label: 'Frontend (Vercel)', rows: [
        ['Framework', 'Next.js 14 (pages router)'],
        ['Styling', 'Tailwind CSS 3.4 with custom EQ color tokens'],
        ['Typography', 'IBM Plex Sans + IBM Plex Mono (Google Fonts)'],
        ['Deploy trigger', 'git push to main → Vercel auto-deploy'],
        ['CDN', 'Vercel Edge Network (~50ms TTFB globally)'],
        ['Root directory', 'portfolio-builder/'],
      ]},
      { type: 'props', label: 'Agent backends (Docker)', rows: [
        ['Runtime', 'Python 3.12 + FastAPI (one container per agent)'],
        ['Images', 'python:3.12-slim base'],
        ['Orchestration', 'docker-compose.yml (local); Railway / AWS Fargate (cloud)'],
        ['Ports', 'A1: 9001, A2: 9002, A3: 9003, A4: 9004, A5: 9005, FM: 9000'],
        ['Data store', 'SQLite (ROCE registry, audit trail) — volume mounted'],
      ]},
    ],
  },
]

function CodeBlock({ text }) {
  return (
    <pre className="bg-eq-bg border border-eq-border rounded-xl px-4 py-3.5 text-[11px] font-mono text-eq-fg2 overflow-x-auto leading-relaxed whitespace-pre scrollbar-thin">
      {text}
    </pre>
  )
}

function Label({ text }) {
  return <div className="text-[9px] font-bold uppercase tracking-widest text-eq-acc mt-4 mb-1.5">{text}</div>
}

function PropsTable({ rows }) {
  return (
    <div className="rounded-xl border border-eq-border overflow-hidden">
      {rows.map(([k, v], i) => (
        <div key={i} className={`flex gap-4 px-4 py-2.5 ${i > 0 ? 'border-t border-eq-border' : ''}`}>
          <span className="font-mono text-[11px] text-eq-fg3 flex-shrink-0 w-40">{k}</span>
          <span className="text-xs text-eq-fg2">{v}</span>
        </div>
      ))}
    </div>
  )
}

function InvariantTable({ rows }) {
  return (
    <div className="space-y-2">
      {rows.map(([id, name, formula], i) => (
        <div key={i} className="flex gap-3 items-start bg-eq-card border border-eq-border rounded-xl px-4 py-3">
          <span className="font-mono text-[11px] font-bold text-violet-400 flex-shrink-0 w-6">{id}</span>
          <span className="text-xs text-eq-fg2 flex-shrink-0 w-40">{name}</span>
          <span className="font-mono text-[11px] text-eq-fg3">{formula}</span>
        </div>
      ))}
    </div>
  )
}

function GateTable({ rows }) {
  return (
    <div className="space-y-2">
      {rows.map(([id, name, cond], i) => (
        <div key={i} className="bg-eq-card border border-eq-border rounded-xl px-4 py-3 space-y-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] font-bold text-amber-400 flex-shrink-0 w-6">{id}</span>
            <span className="font-bold text-xs text-eq-fg">{name}</span>
          </div>
          <div className="font-mono text-[11px] text-eq-fg3 pl-9">{cond}</div>
        </div>
      ))}
    </div>
  )
}

function AgentBlock({ id, name, color, input, output, pre, post, constraint }) {
  return (
    <div className="bg-eq-card border border-eq-border rounded-xl overflow-hidden mt-4">
      <div className="px-4 py-2.5 border-b border-eq-border flex items-center gap-2" style={{ background: color + '0a' }}>
        <span className="font-mono text-[11px] font-bold" style={{ color }}>{id}</span>
        <span className="font-mono font-bold text-sm" style={{ color }}>{name}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-blue-400/70 mb-1">Input</div>
            <pre className="font-mono text-[11px] text-eq-fg2 bg-eq-el rounded px-3 py-2 leading-relaxed whitespace-pre overflow-x-auto">{input}</pre>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-green-400/70 mb-1">Output</div>
            <pre className="font-mono text-[11px] text-eq-fg2 bg-eq-el rounded px-3 py-2 leading-relaxed whitespace-pre overflow-x-auto">{output}</pre>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-violet-400/70 mb-1">Preconditions</div>
            {pre.map((p, i) => <div key={i} className="font-mono text-[11px] text-eq-fg3">· {p}</div>)}
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-amber-400/70 mb-1">Postconditions</div>
            {post.map((p, i) => <div key={i} className="font-mono text-[11px] text-eq-fg3">· {p}</div>)}
          </div>
        </div>
        <div className="font-mono text-[11px] text-eq-fg3">
          <span className="font-bold uppercase tracking-widest text-[9px] text-violet-400/60 mr-2">Constraint</span>
          {constraint}
        </div>
      </div>
    </div>
  )
}

function renderContent(items) {
  return items.map((item, i) => {
    if (item.type === 'p')         return <p key={i} className="text-sm text-eq-fg2 leading-relaxed">{item.text}</p>
    if (item.type === 'code')      return <CodeBlock key={i} text={item.text} />
    if (item.type === 'label')     return <Label key={i} text={item.text} />
    if (item.type === 'props')     return <div key={i}><Label text={item.label} /><PropsTable rows={item.rows} /></div>
    if (item.type === 'invariants') return <InvariantTable key={i} rows={item.rows} />
    if (item.type === 'gates')     return <GateTable key={i} rows={item.rows} />
    if (item.type === 'agent')     return <AgentBlock key={i} {...item} />
    return null
  })
}

export default function Spec() {
  return (
    <Layout title="SDD Specification — EQ Portfolio Builder">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-0">

        {/* header */}
        <div className="pb-6 border-b border-eq-border">
          <div className="text-[9px] font-bold uppercase tracking-widest text-eq-acc mb-1">Specification-Driven Development</div>
          <h1 className="text-2xl font-bold mb-2">SDD Specification v0.2</h1>
          <p className="text-sm text-eq-fg2 max-w-2xl mb-4">
            This specification was written before any code. The implementation maps each definition here exactly.
            Sections 3–6 define invariants, gates, functions, and safety properties. Sections 7–8 define agent
            contracts and the FundManager rules.
          </p>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`}
                className="text-[10px] font-mono px-2.5 py-1 bg-eq-el border border-eq-border rounded-lg text-eq-fg2 hover:text-eq-fg hover:border-eq-border2 transition-colors no-underline">
                {s.title.split('. ')[1]}
              </a>
            ))}
          </div>
        </div>

        {/* sections */}
        {SECTIONS.map(s => (
          <section key={s.id} id={s.id} className="py-8 border-b border-eq-border space-y-4 scroll-mt-16">
            <h2 className="text-base font-bold">{s.title}</h2>
            {renderContent(s.content)}
          </section>
        ))}

        {/* footer */}
        <div className="py-8 text-center space-y-3">
          <div className="text-[10px] font-mono text-eq-fg3">SDD v0.2 · EdgeQuant Portfolio Builder · 2025</div>
          <div className="flex justify-center gap-4">
            <Link href="/demo" className="text-xs font-mono text-eq-acc2 hover:text-white transition-colors no-underline">Open Demo →</Link>
            <Link href="/pipeline" className="text-xs font-mono text-eq-acc2 hover:text-white transition-colors no-underline">Agent Pipeline →</Link>
          </div>
        </div>

      </div>
    </Layout>
  )
}
