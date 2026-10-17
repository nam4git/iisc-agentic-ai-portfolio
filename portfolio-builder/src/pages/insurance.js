/**
 * /insurance — Portfolio Heat + Insurance
 *
 * Portfolio Heat: total open risk as % of portfolio (Black & Jones CPPI framework)
 * CPPI: Constant Proportion Portfolio Insurance — Black & Jones (1987)
 * Protective Put: Black-Scholes (1973)
 */

import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import { SAMPLE_PORTFOLIO, DB } from '../lib/stocks'
import { portfolioHeat, heatLabel, simulateCPPI, simulateGBM, optionInsuranceCost } from '../lib/insurance'

// ─── Heat gauge (SVG arc) ─────────────────────────────────────────────────────

function HeatGauge({ heat }) {
  const MAX   = 25
  const frac  = Math.min(heat / MAX, 1)
  const info  = heatLabel(heat)
  const R     = 64, cx = 80, cy = 80
  const startA = -210 * (Math.PI / 180)
  const endA   = 30  * (Math.PI / 180)
  const sweepA = endA - startA
  const curA   = startA + sweepA * frac

  const arcPath = (r, a0, a1) => {
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0)
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
    const large = (a1 - a0) > Math.PI ? 1 : 0
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
  }

  const zones = [
    { from: 0.00, to: 0.20, color: '#22c55e' },
    { from: 0.20, to: 0.40, color: '#84cc16' },
    { from: 0.40, to: 0.60, color: '#f59e0b' },
    { from: 0.60, to: 0.80, color: '#ef4444' },
    { from: 0.80, to: 1.00, color: '#dc2626' },
  ]

  return (
    <svg width="160" height="120" viewBox="0 0 160 120">
      {/* Zone arcs */}
      {zones.map(z => {
        const a0 = startA + sweepA * z.from
        const a1 = startA + sweepA * z.to
        return (
          <path key={z.from} d={arcPath(R, a0, a1)}
            fill="none" stroke={z.color} strokeWidth="10" strokeLinecap="butt" opacity="0.35" />
        )
      })}
      {/* Track arc */}
      <path d={arcPath(R, startA, endA)} fill="none" stroke="var(--eq-border)" strokeWidth="10" strokeLinecap="round" />
      {/* Filled arc */}
      {frac > 0 && (
        <path d={arcPath(R, startA, curA)} fill="none" stroke={info.color} strokeWidth="10" strokeLinecap="round" />
      )}
      {/* Needle */}
      <line
        x1={cx + (R - 18) * Math.cos(curA)} y1={cy + (R - 18) * Math.sin(curA)}
        x2={cx + (R + 2) * Math.cos(curA)}  y2={cy + (R + 2) * Math.sin(curA)}
        stroke={info.color} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={4} fill={info.color} />
      {/* Labels */}
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="18" fontWeight="bold" fill={info.color}>
        {heat.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 36} textAnchor="middle" fontSize="10" fill={info.color}>{info.label}</text>
      <text x={cx - R + 2} y={cy + 16} textAnchor="middle" fontSize="8" fill="var(--eq-fg3)">0%</text>
      <text x={cx + R - 2} y={cy + 16} textAnchor="middle" fontSize="8" fill="var(--eq-fg3)">{MAX}%+</text>
    </svg>
  )
}

// ─── CPPI line chart (SVG) ────────────────────────────────────────────────────

function CPPIChart({ series }) {
  if (!series || series.length < 2) return null

  const vals   = series.flatMap(p => [p.cppi, p.bah, p.floor])
  const minY   = Math.min(...vals) * 0.98
  const maxY   = Math.max(...vals) * 1.02
  const W = 480, H = 220, PAD = { l: 44, r: 8, t: 12, b: 32 }
  const T = series.length - 1

  const sx = d => PAD.l + (d / T) * (W - PAD.l - PAD.r)
  const sy = v => H - PAD.b - (v - minY) / (maxY - minY) * (H - PAD.t - PAD.b)

  const line = (key, col) => {
    const pts = series.map((p, i) => `${sx(i)},${sy(p[key])}`).join(' ')
    return <polyline key={key} points={pts} fill="none" stroke={col} strokeWidth={key === 'floor' ? 1 : 1.5}
      strokeDasharray={key === 'floor' ? '4 3' : undefined} />
  }

  const ticks = 5
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W }}>
      {Array.from({ length: ticks }, (_, i) => {
        const v = minY + (i / (ticks - 1)) * (maxY - minY)
        const y = sy(v)
        return <g key={i}>
          <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="var(--eq-border)" strokeWidth="0.5" />
          <text x={PAD.l - 4} y={y + 3} fontSize="8" textAnchor="end" fill="var(--eq-fg3)">{v.toFixed(0)}</text>
        </g>
      })}
      {[0, 63, 126, 189, T].map(d => (
        <text key={d} x={sx(d)} y={H - PAD.b + 12} fontSize="8" textAnchor="middle" fill="var(--eq-fg3)">
          D{d}
        </text>
      ))}
      {line('bah',  '#34d399')}
      {line('floor','#ef4444')}
      {line('cppi', '#4a84d9')}
      {/* Legend */}
      {[['CPPI', '#4a84d9'], ['Buy & Hold', '#34d399'], ['Floor', '#ef4444']].map(([label, col], i) => (
        <g key={label}>
          <line x1={PAD.l + i * 100} y1={PAD.t - 4} x2={PAD.l + i * 100 + 16} y2={PAD.t - 4}
            stroke={col} strokeWidth="2" />
          <text x={PAD.l + i * 100 + 20} y={PAD.t} fontSize="8" fill="var(--eq-fg2)">{label}</text>
        </g>
      ))}
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const INIT_POSITIONS = SAMPLE_PORTFOLIO.slice(0, 5).map(h => ({
  ticker:     h.ticker,
  weight_pct: parseFloat(((h.weight / SAMPLE_PORTFOLIO.reduce((s, x) => s + x.weight, 0)) * 100).toFixed(1)),
  risk_pct:   2.0,
}))

export default function InsurancePage() {
  const [positions,   setPositions]   = useState(INIT_POSITIONS)
  const [floorPct,    setFloorPct]    = useState(80)
  const [multiplier,  setMultiplier]  = useState(3)
  const [cppiSeries,  setCppiSeries]  = useState(null)
  const [useRealData, setUseRealData] = useState(false)
  const [fetching,    setFetching]    = useState(false)

  // Option insurance calculator
  const [pfValue,     setPfValue]     = useState(1000000)
  const [protPct,     setProtPct]     = useState(90)
  const [pfVol,       setPfVol]       = useState(18)
  const [horizon,     setHorizon]     = useState(1)

  const heat   = portfolioHeat(positions)
  const hInfo  = heatLabel(heat)

  function updateRisk(i, val) {
    const next = [...positions]
    next[i] = { ...next[i], risk_pct: Math.max(0.1, Math.min(50, parseFloat(val) || 0)) }
    setPositions(next)
  }

  function updateWeight(i, val) {
    const next = [...positions]
    next[i] = { ...next[i], weight_pct: Math.max(0, Math.min(100, parseFloat(val) || 0)) }
    setPositions(next)
  }

  async function simulate() {
    setFetching(true)
    let prices

    if (useRealData) {
      try {
        const resp = await fetch('/api/history/%5ENSEI')  // Nifty 50
        const data = await resp.json()
        if (data.prices?.length > 20) {
          prices = data.prices.map(p => p.close)
        }
      } catch {}
    }

    if (!prices || prices.length < 20) {
      // GBM simulation (offline fallback)
      prices = simulateGBM(100, 0.12, pfVol / 100, 252)
    }

    const series = simulateCPPI(prices, {
      floor_pct:  floorPct / 100,
      multiplier,
      rf_annual:  0.07,
    })
    setCppiSeries(series)
    setFetching(false)
  }

  const optCost = optionInsuranceCost(pfValue, protPct / 100, pfVol / 100, horizon, 0.07)

  const cppiStats = cppiSeries ? {
    finalCPPI:    cppiSeries[cppiSeries.length - 1]?.cppi.toFixed(2),
    finalBaH:     cppiSeries[cppiSeries.length - 1]?.bah.toFixed(2),
    cppiMin:      Math.min(...cppiSeries.map(p => p.cppi)).toFixed(2),
    bahMin:       Math.min(...cppiSeries.map(p => p.bah)).toFixed(2),
    floorBreached: cppiSeries.some(p => p.cppi < p.floor),
  } : null

  return (
    <Layout title="Insurance — EQ Portfolio Builder">
      <div className="max-w-5xl mx-auto px-5 py-8 space-y-10">

        {/* Header */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-eq-acc mb-1">
            Risk Management
          </div>
          <h1 className="text-2xl font-bold mb-2">Portfolio Heat &amp; Insurance</h1>
          <p className="text-sm text-eq-fg2 leading-relaxed max-w-2xl">
            Portfolio Heat measures total open risk as a fraction of equity — the sum of
            (position weight × stop distance) across all holdings. Once you know your heat,
            you can insure the portfolio using CPPI or protective puts.
          </p>
        </div>

        {/* ── Section 1: Portfolio Heat ── */}
        <section className="space-y-4">
          <h2 className="text-base font-bold border-b border-eq-border pb-2">
            1 · Portfolio Heat
          </h2>

          <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">
            {/* Gauge */}
            <div className="border border-eq-border rounded-lg px-6 py-5 bg-eq-card flex flex-col items-center gap-2">
              <HeatGauge heat={heat} />
              <div className="text-xs font-mono text-eq-fg3 text-center">
                Total open risk as % of portfolio
              </div>
              <div className="text-xs text-eq-fg3 text-center space-y-0.5">
                <div style={{ color: '#22c55e' }}>■ Cool  &lt;5%</div>
                <div style={{ color: '#84cc16' }}>■ Warm  5–10%</div>
                <div style={{ color: '#f59e0b' }}>■ Hot   10–15%</div>
                <div style={{ color: '#ef4444' }}>■ Danger 15–20%</div>
                <div style={{ color: '#dc2626' }}>■ Critical &gt;20%</div>
              </div>
            </div>

            {/* Position table */}
            <div className="border border-eq-border rounded-lg overflow-hidden bg-eq-card">
              <div className="px-4 py-3 border-b border-eq-border text-sm font-medium">
                Position Risk — edit weight and stop distance
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-eq-border bg-eq-bg2">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-eq-fg2">Ticker</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-eq-fg2">Weight %</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-eq-fg2">Risk % (entry→stop)</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-eq-fg2">Heat contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p, i) => {
                    const contrib = (p.weight_pct / 100) * (p.risk_pct / 100) * 100
                    return (
                      <tr key={p.ticker} className="border-t border-eq-border">
                        <td className="px-4 py-2 font-mono text-sm">{p.ticker}</td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" value={p.weight_pct} min="0" max="100" step="0.5"
                            onChange={e => updateWeight(i, e.target.value)}
                            className="w-16 bg-eq-el border border-eq-border rounded px-2 py-0.5 font-mono text-sm text-right focus:outline-none focus:border-eq-border2" />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" value={p.risk_pct} min="0.1" max="50" step="0.1"
                            onChange={e => updateRisk(i, e.target.value)}
                            className="w-16 bg-eq-el border border-eq-border rounded px-2 py-0.5 font-mono text-sm text-right focus:outline-none focus:border-eq-border2" />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className="font-mono text-sm" style={{ color: contrib > 3 ? 'var(--eq-loss)' : contrib > 1.5 ? 'var(--eq-warn)' : 'var(--eq-gain)' }}>
                            {contrib.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-eq-border bg-eq-el/30">
                    <td colSpan={3} className="px-4 py-2.5 text-sm font-semibold">Portfolio Heat</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-mono font-bold text-sm" style={{ color: hInfo.color }}>
                        {heat.toFixed(2)}% — {hInfo.label}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>

        {/* ── Section 2: CPPI Insurance ── */}
        <section className="space-y-4">
          <h2 className="text-base font-bold border-b border-eq-border pb-2">
            2 · CPPI Insurance  <span className="text-xs font-normal text-eq-fg3 ml-2">Black &amp; Jones (1987)</span>
          </h2>
          <p className="text-sm text-eq-fg2 leading-relaxed">
            Constant Proportion Portfolio Insurance dynamically allocates between the risky portfolio
            and a risk-free bond. The risky allocation = <em>m × Cushion</em>, where the cushion is
            portfolio value minus the protected floor. When the portfolio falls, the risky allocation
            is reduced — the floor is never breached (in theory, absent gap risk).
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="border border-eq-border rounded-lg px-4 py-3 bg-eq-card">
              <div className="text-xs text-eq-fg3 mb-1">Floor (protection level)</div>
              <div className="flex items-center gap-2">
                <input type="range" min="50" max="99" value={floorPct} onChange={e => setFloorPct(+e.target.value)}
                  className="flex-1" />
                <span className="font-mono text-sm w-10 text-right">{floorPct}%</span>
              </div>
              <div className="text-xs text-eq-fg3 mt-1">Minimum terminal value guaranteed</div>
            </div>
            <div className="border border-eq-border rounded-lg px-4 py-3 bg-eq-card">
              <div className="text-xs text-eq-fg3 mb-1">Multiplier m</div>
              <div className="flex items-center gap-2">
                <input type="range" min="1" max="10" value={multiplier} onChange={e => setMultiplier(+e.target.value)}
                  className="flex-1" />
                <span className="font-mono text-sm w-4 text-right">{multiplier}</span>
              </div>
              <div className="text-xs text-eq-fg3 mt-1">Risky alloc = m × (V − Floor)</div>
            </div>
            <div className="border border-eq-border rounded-lg px-4 py-3 bg-eq-card">
              <div className="text-xs text-eq-fg3 mb-1">Price data</div>
              <label className="flex items-center gap-2 cursor-pointer text-sm mt-2">
                <input type="checkbox" checked={useRealData} onChange={e => setUseRealData(e.target.checked)}
                  className="rounded" />
                Use live Nifty 50 (^NSEI)
              </label>
              <div className="text-xs text-eq-fg3 mt-1">Unchecked = GBM simulation (μ=12%, σ={pfVol}%)</div>
            </div>
          </div>

          <button onClick={simulate} disabled={fetching}
            className="px-6 py-2 bg-eq-acc text-white rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
            {fetching ? 'Simulating…' : 'Simulate CPPI →'}
          </button>

          {cppiSeries && (
            <>
              <div className="border border-eq-border rounded-lg overflow-hidden bg-eq-card">
                <div className="px-4 py-3 border-b border-eq-border text-sm font-medium">
                  CPPI vs Buy &amp; Hold (normalised to 100)
                </div>
                <div className="px-4 py-3 overflow-x-auto">
                  <CPPIChart series={cppiSeries} />
                </div>
              </div>

              <div className="grid sm:grid-cols-4 gap-3">
                {[
                  { label: 'CPPI final',     value: cppiStats.finalCPPI, sub: 'normalised' },
                  { label: 'B&H final',      value: cppiStats.finalBaH,  sub: 'normalised' },
                  { label: 'CPPI worst',     value: cppiStats.cppiMin,   sub: 'intra-period' },
                  { label: 'Floor breached', value: cppiStats.floorBreached ? 'YES ⚠' : 'No ✓',
                    sub: 'gap risk excluded' },
                ].map(tile => (
                  <div key={tile.label} className="border border-eq-border rounded-lg px-4 py-3 bg-eq-card">
                    <div className="text-xs text-eq-fg3">{tile.label}</div>
                    <div className="text-xl font-mono font-semibold mt-1"
                      style={tile.label === 'Floor breached' ? { color: cppiStats.floorBreached ? 'var(--eq-loss)' : 'var(--eq-gain)' } : {}}>
                      {tile.value}
                    </div>
                    <div className="text-xs text-eq-fg3 mt-0.5">{tile.sub}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ── Section 3: Option-based insurance ── */}
        <section className="space-y-4">
          <h2 className="text-base font-bold border-b border-eq-border pb-2">
            3 · Protective Put Cost  <span className="text-xs font-normal text-eq-fg3 ml-2">Black-Scholes (1973)</span>
          </h2>
          <p className="text-sm text-eq-fg2 leading-relaxed">
            A protective put buys a put option on the portfolio (or a proxy index) at a strike equal to
            the desired floor. The Black-Scholes formula prices the insurance cost upfront.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Portfolio value (₹)', val: pfValue,  set: setPfValue,  min: 10000,  max: 100000000, step: 10000 },
              { label: 'Protection level %',  val: protPct,  set: setProtPct,  min: 50,     max: 100,       step: 1 },
              { label: 'Portfolio vol % p.a.',val: pfVol,    set: setPfVol,    min: 5,      max: 80,        step: 1 },
              { label: 'Horizon (years)',      val: horizon,  set: setHorizon,  min: 0.25,   max: 3,         step: 0.25 },
            ].map(({ label, val, set, min, max, step }) => (
              <div key={label} className="border border-eq-border rounded-lg px-4 py-3 bg-eq-card">
                <div className="text-xs text-eq-fg3 mb-1">{label}</div>
                <input type="number" value={val} min={min} max={max} step={step}
                  onChange={e => set(parseFloat(e.target.value) || min)}
                  className="w-full bg-eq-el border border-eq-border rounded px-2 py-1.5 font-mono text-sm focus:outline-none focus:border-eq-border2" />
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Put price (₹)',      value: `₹${optCost.put_price.toLocaleString()}` },
              { label: 'Cost as % of value', value: `${optCost.cost_pct}%` },
              { label: 'Annual drag',        value: `${optCost.annual_drag}% p.a.` },
              { label: 'Breakeven level',    value: `₹${optCost.breakeven.toLocaleString()}` },
            ].map(tile => (
              <div key={tile.label} className="border border-eq-border rounded-lg px-4 py-3 bg-eq-card">
                <div className="text-xs text-eq-fg3">{tile.label}</div>
                <div className="text-xl font-mono font-semibold mt-1">{tile.value}</div>
              </div>
            ))}
          </div>

          <div className="border border-eq-border/60 rounded-lg px-4 py-3 text-xs text-eq-fg3 space-y-1">
            <div className="font-bold text-eq-fg2">How to use this in practice</div>
            <div>Buy a put option on Nifty (or Bank Nifty) with strike = portfolio value × {protPct}%
              and expiry at your horizon date. The premium is the insurance cost shown above.
              Gap risk applies — large overnight moves can breach any floor.</div>
            <div>References: Black, F. &amp; Jones, R. (1987). Simplifying Portfolio Insurance. <em>Journal of Portfolio Management</em>.
              Black, F. &amp; Scholes, M. (1973). The Pricing of Options and Corporate Liabilities. <em>Journal of Political Economy</em>.</div>
          </div>
        </section>

      </div>
    </Layout>
  )
}
