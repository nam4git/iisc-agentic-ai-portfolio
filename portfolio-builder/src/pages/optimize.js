/**
 * /optimize — Portfolio Optimization
 * Academic methods inspired by skfolio (https://github.com/skfolio/skfolio, MIT License)
 * Use `pip install skfolio` for production Python implementation.
 */

import { useState } from 'react'
import Layout from '../components/Layout'
import { SAMPLE_PORTFOLIO } from '../lib/stocks'

const DEFAULT_TICKERS = SAMPLE_PORTFOLIO.map(h => h.ticker).join(', ')

const METHOD_META = {
  min_var:    { label: 'Min Variance',    badge: 'MV',   ref: 'Markowitz 1952'                      },
  max_sharpe: { label: 'Max Sharpe',      badge: 'MS',   ref: 'Sharpe 1966'                         },
  erc:        { label: 'Risk Parity',     badge: 'ERC',  ref: 'Maillard et al. 2010'                },
  hrp:        { label: 'HRP',             badge: 'HRP',  ref: 'López de Prado 2016'                 },
  min_cvar:   { label: 'Min CVaR 95%',    badge: 'CVaR', ref: 'Rockafellar & Uryasev 2000'          },
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function interpolateColor(value, min, max) {
  // blue (-1) → white (0) → orange (+1)
  const t = (value - min) / (max - min || 1)
  const r = t < 0.5 ? Math.round(74 + (255 - 74) * (t * 2)) : 255
  const g = t < 0.5 ? Math.round(132 + (255 - 132) * (t * 2)) : Math.round(255 - 165 * ((t - 0.5) * 2))
  const b = t < 0.5 ? Math.round(217 + (255 - 217) * (t * 2)) : Math.round(255 - 255 * ((t - 0.5) * 2))
  return `rgb(${r},${g},${b})`
}

function CorrHeatmap({ corr, tickers }) {
  if (!corr || !tickers) return null
  const n    = tickers.length
  const cell = Math.max(32, Math.min(56, Math.floor(400 / n)))
  const pad  = 50
  const w    = pad + n * cell + 4
  const h    = pad + n * cell + 4

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: w }}>
      {tickers.map((t, j) => (
        <text key={`col-${j}`} x={pad + j * cell + cell / 2} y={pad - 6}
          fontSize="9" textAnchor="middle" fill="var(--eq-fg3)">{t.slice(0, 7)}</text>
      ))}
      {tickers.map((t, i) => (
        <text key={`row-${i}`} x={pad - 4} y={pad + i * cell + cell / 2 + 3}
          fontSize="9" textAnchor="end" fill="var(--eq-fg3)">{t.slice(0, 7)}</text>
      ))}
      {corr.map((row, i) =>
        row.map((val, j) => (
          <g key={`${i}-${j}`}>
            <rect x={pad + j * cell} y={pad + i * cell} width={cell - 1} height={cell - 1}
              fill={interpolateColor(val, -1, 1)} rx="2" />
            {cell >= 40 && (
              <text x={pad + j * cell + cell / 2} y={pad + i * cell + cell / 2 + 3}
                fontSize="8" textAnchor="middle"
                fill={Math.abs(val) > 0.5 ? '#fff' : '#333'}>{val.toFixed(2)}</text>
            )}
          </g>
        ))
      )}
    </svg>
  )
}

function FrontierPlot({ frontier, optimized }) {
  if (!frontier || !optimized) return null

  const allVols = [...frontier.map(p => p.vol), ...Object.values(optimized).map(m => m.stats.vol)]
  const allRets = [...frontier.map(p => p.ret), ...Object.values(optimized).map(m => m.stats.ret)]

  const minVol = Math.min(...allVols) * 0.9
  const maxVol = Math.max(...allVols) * 1.1
  const minRet = Math.min(...allRets) * 0.9
  const maxRet = Math.max(...allRets) * 1.1

  const W = 480, H = 260, PAD = { l: 48, r: 16, t: 16, b: 36 }
  const sx = v => PAD.l + (v - minVol) / (maxVol - minVol) * (W - PAD.l - PAD.r)
  const sy = r => H - PAD.b - (r - minRet) / (maxRet - minRet) * (H - PAD.t - PAD.b)

  const yTicks = 5
  const xTicks = 5

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W }}>
      {/* Grid */}
      {Array.from({ length: yTicks }, (_, i) => {
        const r   = minRet + (i / (yTicks - 1)) * (maxRet - minRet)
        const y   = sy(r)
        return <g key={i}>
          <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="var(--eq-border)" strokeWidth="0.5" />
          <text x={PAD.l - 4} y={y + 3} fontSize="8" textAnchor="end" fill="var(--eq-fg3)">{r.toFixed(0)}%</text>
        </g>
      })}
      {Array.from({ length: xTicks }, (_, i) => {
        const v = minVol + (i / (xTicks - 1)) * (maxVol - minVol)
        const x = sx(v)
        return <g key={i}>
          <line x1={x} y1={PAD.t} x2={x} y2={H - PAD.b} stroke="var(--eq-border)" strokeWidth="0.5" />
          <text x={x} y={H - PAD.b + 12} fontSize="8" textAnchor="middle" fill="var(--eq-fg3)">{v.toFixed(0)}%</text>
        </g>
      })}
      {/* Axis labels */}
      <text x={W / 2} y={H - 2} fontSize="9" textAnchor="middle" fill="var(--eq-fg3)">Volatility (% p.a.)</text>
      <text x={10} y={H / 2} fontSize="9" textAnchor="middle" fill="var(--eq-fg3)"
        transform={`rotate(-90, 10, ${H / 2})`}>Return (% p.a.)</text>
      {/* Random portfolios */}
      {frontier.map((p, i) => (
        <circle key={i} cx={sx(p.vol)} cy={sy(p.ret)} r={2.5}
          fill="var(--eq-fg3)" opacity={0.4} />
      ))}
      {/* Optimized portfolios */}
      {Object.entries(optimized).map(([key, m]) => (
        <g key={key}>
          <circle cx={sx(m.stats.vol)} cy={sy(m.stats.ret)} r={6}
            fill={m.color} stroke="var(--eq-bg)" strokeWidth={1.5} />
          <text x={sx(m.stats.vol) + 8} y={sy(m.stats.ret) + 3}
            fontSize="8" fill={m.color}>{METHOD_META[key]?.badge}</text>
        </g>
      ))}
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OptimizePage() {
  const [tickerInput, setTickerInput] = useState(DEFAULT_TICKERS)
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState(null)
  const [error,       setError]       = useState('')
  const [activeMethod, setActiveMethod] = useState('hrp')

  async function runOptimization() {
    const tickers = tickerInput.split(/[\s,]+/).map(t => t.trim().toUpperCase()).filter(Boolean)
    if (tickers.length < 2) { setError('Enter at least 2 tickers.'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const resp = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers }),
      })
      const data = await resp.json()
      if (data.error) { setError(data.error); return }
      setResult(data)
      setActiveMethod('hrp')
    } catch { setError('Network error.') }
    finally  { setLoading(false) }
  }

  const activeOpt = result?.optimized?.[activeMethod]

  return (
    <Layout title="Optimize — EQ Portfolio Builder">
      <div className="max-w-5xl mx-auto px-5 py-8 space-y-8">

        {/* header */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-eq-acc mb-1">
            Portfolio Optimisation
          </div>
          <h1 className="text-2xl font-bold mb-2">Portfolio Optimizer</h1>
          <p className="text-sm text-eq-fg2 max-w-2xl leading-relaxed">
            Five portfolio optimisation methods applied to 1-year live NSE/BSE price history.
            Algorithms are inspired by{' '}
            <a href="https://github.com/skfolio/skfolio" target="_blank" rel="noopener noreferrer"
               className="text-eq-acc hover:underline">skfolio</a>
            {' '}(MIT License) — install <code className="font-mono text-xs bg-eq-el px-1 rounded">pip install skfolio</code> for production Python use.
          </p>
        </div>

        {/* input */}
        <div className="border border-eq-border rounded-lg px-5 py-4 bg-eq-card space-y-3">
          <div className="text-sm font-medium">NSE / BSE Tickers</div>
          <div className="flex gap-2 flex-wrap">
            <input
              value={tickerInput}
              onChange={e => setTickerInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && runOptimization()}
              placeholder="HDFCBANK, RELIANCE, INFY, TCS, ICICIBANK"
              className="flex-1 min-w-[280px] bg-eq-el border border-eq-border rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-eq-border2"
            />
            <button onClick={runOptimization} disabled={loading}
              className="px-6 py-2 bg-eq-acc text-white rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? 'Computing…' : 'Optimize →'}
            </button>
          </div>
          {error && <p className="text-sm text-eq-loss font-mono">{error}</p>}
          {result && (
            <p className="text-xs text-eq-fg3 font-mono">
              {result.trading_days} trading days · {result.data_period}
            </p>
          )}
        </div>

        {result && (
          <>
            {/* method selector + summary comparison */}
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-eq-fg3 mb-3">
                Method Comparison — click to inspect
              </div>
              <div className="border border-eq-border rounded-lg overflow-hidden bg-eq-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-eq-border bg-eq-bg2">
                      <th className="px-4 py-3 text-left text-xs font-medium text-eq-fg2">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-eq-fg2">Reference</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-eq-fg2">Return % p.a.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-eq-fg2">Vol % p.a.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-eq-fg2">Sharpe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.optimized).map(([key, m]) => {
                      const isActive = activeMethod === key
                      return (
                        <tr key={key}
                          onClick={() => setActiveMethod(key)}
                          className={`border-t border-eq-border cursor-pointer transition-colors ${isActive ? 'bg-eq-hover' : 'hover:bg-eq-hover'}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.color }} />
                              <span className="font-medium text-sm">{m.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-eq-fg3">{m.ref}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm"
                            style={{ color: m.stats.ret >= 0 ? 'var(--eq-gain)' : 'var(--eq-loss)' }}>
                            {m.stats.ret >= 0 ? '+' : ''}{m.stats.ret}%
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-eq-fg2">{m.stats.vol}%</td>
                          <td className="px-4 py-3 text-right font-mono text-sm"
                            style={{ color: m.stats.sharpe >= 1 ? 'var(--eq-gain)' : m.stats.sharpe >= 0 ? 'var(--eq-fg2)' : 'var(--eq-loss)' }}>
                            {m.stats.sharpe}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* active method weights */}
            {activeOpt && (
              <div className="grid md:grid-cols-2 gap-5">
                <div className="border border-eq-border rounded-lg overflow-hidden bg-eq-card">
                  <div className="px-4 py-3 border-b border-eq-border flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: activeOpt.color }} />
                    <span className="font-medium text-sm">{activeOpt.name}</span>
                    <span className="text-xs font-mono text-eq-fg3 ml-auto">{activeOpt.ref}</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-eq-border bg-eq-bg2">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-eq-fg2">Ticker</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-eq-fg2">Weight</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-eq-fg2">Risk Contrib.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(activeOpt.weights)
                        .sort((a, b) => b[1] - a[1])
                        .map(([t, w]) => {
                          const rc = activeOpt.risk_contributions?.[t] ?? 0
                          return (
                            <tr key={t} className="border-t border-eq-border hover:bg-eq-hover">
                              <td className="px-4 py-2.5 font-mono text-sm">{t}</td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="h-1.5 rounded-full bg-eq-el w-16 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${w * 100}%`, background: activeOpt.color }} />
                                  </div>
                                  <span className="font-mono text-sm w-12 text-right">{(w * 100).toFixed(1)}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-sm text-eq-fg2">{rc.toFixed(1)}%</td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Risk contributions bar chart */}
                <div className="border border-eq-border rounded-lg overflow-hidden bg-eq-card">
                  <div className="px-4 py-3 border-b border-eq-border text-sm font-medium">Risk Contribution</div>
                  <div className="px-4 py-3 space-y-2">
                    {Object.entries(activeOpt.risk_contributions || {})
                      .sort((a, b) => b[1] - a[1])
                      .map(([t, rc]) => (
                        <div key={t} className="flex items-center gap-3 text-sm">
                          <span className="font-mono text-eq-fg2 w-20 text-right flex-shrink-0">{t}</span>
                          <div className="flex-1 bg-eq-el rounded-full h-3 overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(rc, 100)}%`, background: activeOpt.color }} />
                          </div>
                          <span className="font-mono text-xs text-eq-fg2 w-12 text-right">{rc.toFixed(1)}%</span>
                        </div>
                      ))}
                    <p className="text-xs text-eq-fg3 pt-1">
                      Ideal ERC: equal bars across all assets.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Efficient frontier + correlation heatmap */}
            <div className="grid md:grid-cols-2 gap-5">
              <div className="border border-eq-border rounded-lg overflow-hidden bg-eq-card">
                <div className="px-4 py-3 border-b border-eq-border">
                  <div className="text-sm font-medium">Efficient Frontier</div>
                  <div className="text-xs text-eq-fg3 mt-0.5">300 random portfolios · 5 optimized</div>
                </div>
                <div className="px-4 py-3 overflow-x-auto">
                  <FrontierPlot frontier={result.frontier} optimized={result.optimized} />
                </div>
              </div>

              <div className="border border-eq-border rounded-lg overflow-hidden bg-eq-card">
                <div className="px-4 py-3 border-b border-eq-border">
                  <div className="text-sm font-medium">Correlation Matrix</div>
                  <div className="text-xs text-eq-fg3 mt-0.5">Blue = negative · Orange = positive</div>
                </div>
                <div className="px-4 py-3 overflow-x-auto">
                  <CorrHeatmap corr={result.corr} tickers={result.tickers} />
                </div>
              </div>
            </div>

            {/* Annual return / vol summary */}
            <div className="border border-eq-border rounded-lg overflow-hidden bg-eq-card">
              <div className="px-4 py-3 border-b border-eq-border text-sm font-medium">
                Asset Statistics (1yr, annualised)
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-eq-border bg-eq-bg2">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-eq-fg2">Ticker</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-eq-fg2">Return % p.a.</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-eq-fg2">Volatility % p.a.</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-eq-fg2">Sharpe (rf=7%)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.tickers.map((t, i) => {
                    const mu  = result.mu[i]
                    const vol = result.vols[i]
                    const sh  = vol > 0 ? ((mu - 7) / vol).toFixed(2) : '—'
                    return (
                      <tr key={t} className="border-t border-eq-border hover:bg-eq-hover">
                        <td className="px-4 py-2.5 font-mono text-sm">{t}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm"
                          style={{ color: mu >= 0 ? 'var(--eq-gain)' : 'var(--eq-loss)' }}>
                          {mu >= 0 ? '+' : ''}{mu}%
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm text-eq-fg2">{vol}%</td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm text-eq-fg2">{sh}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* skfolio attribution */}
            <div className="border border-eq-border/60 rounded-lg px-4 py-3 text-xs text-eq-fg3 space-y-1">
              <div className="font-bold text-eq-fg2">Attribution</div>
              <div>Algorithms implemented in JavaScript, inspired by{' '}
                <a href="https://github.com/skfolio/skfolio" target="_blank" rel="noopener noreferrer"
                  className="text-eq-acc hover:underline">skfolio</a>{' '}(MIT License, Hugo Delatte et al.).
                For production use, install the Python library: <code className="bg-eq-el px-1 rounded">pip install skfolio</code>.
              </div>
              <div>References: Markowitz (1952) · Sharpe (1966) · Maillard, Roncalli &amp; Teïletche (2010) · López de Prado (2016) · Rockafellar &amp; Uryasev (2000).</div>
            </div>
          </>
        )}

        {!result && !loading && (
          <div className="border border-dashed border-eq-border rounded-lg px-5 py-12 text-center text-eq-fg3">
            <div className="text-sm mb-1">Enter NSE tickers above and click Optimize →</div>
            <div className="text-xs">Fetches 1-year daily price history from Yahoo Finance</div>
          </div>
        )}

      </div>
    </Layout>
  )
}
