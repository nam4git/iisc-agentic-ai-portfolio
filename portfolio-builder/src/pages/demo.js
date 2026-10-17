import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import MetricBar from '../components/portfolio/MetricTiles'
import HoldingsTable from '../components/portfolio/HoldingsTable'
import SectorDonut from '../components/portfolio/SectorDonut'
import ScatterPlot from '../components/portfolio/ScatterPlot'
import { SAMPLE_PORTFOLIO, DB } from '../lib/stocks'
import { calcMetrics, sectorBreakdown, validateAdd, normalise } from '../lib/portfolio'

export default function Demo() {
  const [portfolio, setPortfolio] = useState(SAMPLE_PORTFOLIO.map(p => ({ ...p })))
  const [ticker, setTicker]       = useState('')
  const [weight, setWeight]       = useState('')
  const [error, setError]         = useState('')
  const [liveQuotes, setLiveQuotes] = useState({})
  const [marketStatus, setMarketStatus] = useState(null)
  const [liveLoading, setLiveLoading]   = useState(false)

  useEffect(() => {
    fetchMarketStatus()
    fetchLiveQuotes(portfolio)
  }, [])

  async function fetchMarketStatus() {
    try {
      const r = await fetch('/api/market-status')
      setMarketStatus(await r.json())
    } catch {}
  }

  async function fetchLiveQuotes(pf) {
    if (!pf.length) return
    setLiveLoading(true)
    try {
      const tickers = pf.map(h => h.ticker).join(',')
      const r = await fetch(`/api/quotes?tickers=${tickers}`)
      setLiveQuotes(await r.json())
    } catch {}
    setLiveLoading(false)
  }

  const { data, wRet, wBeta, wVol, sharpe: sh } = calcMetrics(portfolio)
  const sectors = sectorBreakdown(portfolio)

  function updateWeight(i, val) {
    if (!isNaN(val) && val > 0) {
      const next = [...portfolio]
      next[i] = { ...next[i], weight: val }
      setPortfolio(next)
    }
  }

  function removeStock(i) { setPortfolio(portfolio.filter((_, idx) => idx !== i)) }

  function addStock() {
    const t = ticker.trim().toUpperCase()
    const err = validateAdd(t, weight, portfolio)
    if (err) { setError(err); return }
    setError('')
    setPortfolio([...portfolio, { ticker: t, weight: parseFloat(weight) }])
    setTicker(''); setWeight('')
  }

  const suggestions = Object.keys(DB).filter(t => !portfolio.find(h => h.ticker === t)).slice(0, 5)

  return (
    <Layout title="Portfolio — EQ Portfolio Builder">
      <div className="max-w-6xl mx-auto px-5 py-8 space-y-5">

        {/* page title row */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold">Portfolio</h1>
          {marketStatus ? (
            <span className="text-xs font-mono px-2 py-0.5 rounded border"
              style={marketStatus.open
                ? { color: 'var(--eq-gain)', background: '#22c55e12', borderColor: '#22c55e40' }
                : { color: 'var(--eq-fg3)', background: 'var(--eq-el)', borderColor: 'var(--eq-border)' }}>
              {marketStatus.open ? '● Live' : '○ Closed'} · {marketStatus.time_ist} IST
            </span>
          ) : (
            <span className="text-xs text-eq-fg3 font-mono">sample data</span>
          )}
          {liveLoading && <span className="text-xs text-eq-fg3 font-mono">refreshing…</span>}
          <button onClick={() => fetchLiveQuotes(portfolio)}
            className="text-xs px-2.5 py-1 border border-eq-border rounded text-eq-fg2 hover:text-eq-fg hover:border-eq-border2 transition-colors ml-auto">
            ↻ Refresh prices
          </button>
          <span className="text-xs text-eq-fg3 font-mono hidden sm:block">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* metrics bar */}
        <MetricBar wRet={wRet} wBeta={wBeta} wVol={wVol} sharpe={sh} />

        {/* main layout */}
        <div className="grid xl:grid-cols-[1fr_320px] gap-5 items-start">

          {/* holdings table */}
          <div className="border border-eq-border rounded-lg overflow-hidden bg-eq-card">
            <div className="px-4 py-2.5 border-b border-eq-border flex items-center justify-between">
              <span className="text-sm font-medium">Holdings</span>
              <span className="text-xs text-eq-fg3 font-mono">{portfolio.length} stocks</span>
            </div>
            <HoldingsTable data={data} portfolio={portfolio}
              onUpdateWeight={updateWeight} onRemove={removeStock} />
          </div>

          {/* right column */}
          <div className="space-y-5">
            {/* sector allocation */}
            <div className="border border-eq-border rounded-lg overflow-hidden bg-eq-card">
              <div className="px-4 py-2.5 border-b border-eq-border">
                <span className="text-sm font-medium">Sector</span>
              </div>
              <SectorDonut sectors={sectors} />
            </div>

            {/* risk vs return */}
            <div className="border border-eq-border rounded-lg overflow-hidden bg-eq-card">
              <div className="px-4 py-2.5 border-b border-eq-border">
                <span className="text-sm font-medium">Risk vs Return</span>
              </div>
              <ScatterPlot data={data} pfRet={wRet} pfVol={wVol} />
            </div>
          </div>
        </div>

        {/* add stock bar */}
        <div className="border border-eq-border rounded-lg px-4 py-3 bg-eq-card space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-eq-fg3 mr-1">Add stock</span>
            <input
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && addStock()}
              placeholder="Ticker"
              maxLength={12}
              className="bg-eq-el border border-eq-border rounded px-3 py-1.5 font-mono text-sm w-28 focus:outline-none focus:border-eq-border2"
            />
            <input
              value={weight}
              onChange={e => setWeight(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addStock()}
              type="number"
              placeholder="Weight %"
              min="1"
              className="bg-eq-el border border-eq-border rounded px-3 py-1.5 font-mono text-sm w-24 focus:outline-none focus:border-eq-border2"
            />
            <button onClick={addStock}
              className="px-4 py-1.5 bg-eq-acc text-white rounded text-sm font-medium hover:bg-eq-acc/90 transition-colors">
              Add
            </button>
            <button onClick={() => setPortfolio(normalise(portfolio))}
              className="px-4 py-1.5 border border-eq-border text-eq-fg2 hover:text-eq-fg rounded text-sm transition-colors">
              Normalise
            </button>
            <button onClick={() => { setPortfolio(SAMPLE_PORTFOLIO.map(p => ({ ...p }))); setError('') }}
              className="px-4 py-1.5 border border-eq-border text-eq-fg2 hover:text-eq-fg rounded text-sm transition-colors">
              Reset
            </button>
            {error && <span className="text-xs text-eq-loss font-mono">{error}</span>}
          </div>
          {suggestions.length > 0 && !error && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-eq-fg3">Suggestions:</span>
              {suggestions.map(s => (
                <button key={s} onClick={() => { setTicker(s); setWeight('5') }}
                  className="text-xs font-mono px-2 py-0.5 border border-eq-border rounded text-eq-fg2 hover:text-eq-fg hover:border-eq-border2 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* agentic analysis note */}
        <div className="border border-eq-border rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-eq-acc flex-shrink-0" />
          <span className="text-sm text-eq-fg2">
            Agentic analysis — A1 breakout scan, A2 ROCE gate, A3 entry levels
          </span>
          <a href="/pipeline" className="text-xs text-eq-acc no-underline hover:underline ml-auto">View pipeline →</a>
        </div>

      </div>
    </Layout>
  )
}
