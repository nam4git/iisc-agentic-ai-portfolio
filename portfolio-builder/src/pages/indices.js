/**
 * /indices — All NSE & BSE Indices
 * Live prices via Yahoo Finance.
 */

import { useState, useEffect } from 'react'
import Layout from '../components/Layout'

const NSE_INDICES = [
  { symbol: '^NSEI',       name: 'Nifty 50',               category: 'Broad' },
  { symbol: '^NSEBANK',    name: 'Bank Nifty',              category: 'Broad' },
  { symbol: '^CNX100',     name: 'Nifty 100',               category: 'Broad' },
  { symbol: '^CNX200',     name: 'Nifty 200',               category: 'Broad' },
  { symbol: '^CNX500',     name: 'Nifty 500',               category: 'Broad' },
  { symbol: '^CNXMIDCAP',  name: 'Nifty Midcap 100',        category: 'Size' },
  { symbol: '^NSEMDCP50',  name: 'Nifty Midcap 50',         category: 'Size' },
  { symbol: '^CNXSC',      name: 'Nifty Smallcap 50',       category: 'Size' },
  { symbol: '^CNXSMALLCAP',name: 'Nifty Smallcap 100',      category: 'Size' },
  { symbol: '^CNXIT',      name: 'Nifty IT',                category: 'Sector' },
  { symbol: '^CNXAUTO',    name: 'Nifty Auto',              category: 'Sector' },
  { symbol: '^CNXPHARMA',  name: 'Nifty Pharma',            category: 'Sector' },
  { symbol: '^CNXFMCG',    name: 'Nifty FMCG',             category: 'Sector' },
  { symbol: '^CNXMETAL',   name: 'Nifty Metal',             category: 'Sector' },
  { symbol: '^CNXENERGY',  name: 'Nifty Energy',            category: 'Sector' },
  { symbol: '^CNXINFRA',   name: 'Nifty Infra',             category: 'Sector' },
  { symbol: '^CNXREALTY',  name: 'Nifty Realty',            category: 'Sector' },
  { symbol: '^CNXFINANCE', name: 'Nifty Financial Svc',     category: 'Sector' },
  { symbol: '^CNXMEDIA',   name: 'Nifty Media',             category: 'Sector' },
  { symbol: '^CNXPSE',     name: 'Nifty PSE',               category: 'Theme' },
  { symbol: '^CNXCONSUMP', name: 'Nifty Consumption',       category: 'Theme' },
  { symbol: '^CNXCPSE',    name: 'Nifty CPSE',              category: 'Theme' },
]

const BSE_INDICES = [
  { symbol: '^BSESN',      name: 'BSE Sensex',              category: 'Broad' },
  { symbol: '^BSE100',     name: 'BSE 100',                 category: 'Broad' },
  { symbol: '^BSE200',     name: 'BSE 200',                 category: 'Broad' },
  { symbol: '^BSE500',     name: 'BSE 500',                 category: 'Broad' },
  { symbol: '^BSEMCAP',    name: 'BSE Midcap',              category: 'Size' },
  { symbol: '^BSESCAP',    name: 'BSE Smallcap',            category: 'Size' },
  { symbol: '^BSEHC',      name: 'BSE Healthcare',          category: 'Sector' },
  { symbol: '^BSECD',      name: 'BSE Consumer Durables',   category: 'Sector' },
  { symbol: '^BSEIT',      name: 'BSE IT',                  category: 'Sector' },
  { symbol: '^BSEBANKEX',  name: 'BSE Bankex',              category: 'Sector' },
  { symbol: '^BSEAUTO',    name: 'BSE Auto',                category: 'Sector' },
  { symbol: '^BSEPSU',     name: 'BSE PSU',                 category: 'Theme' },
]

const ALL_INDICES = [
  ...NSE_INDICES.map(i => ({ ...i, exchange: 'NSE' })),
  ...BSE_INDICES.map(i => ({ ...i, exchange: 'BSE' })),
]

const CATEGORIES = ['All', 'Broad', 'Size', 'Sector', 'Theme']

function pctColor(v) {
  if (v === null || v === undefined) return 'var(--eq-fg3)'
  return v >= 0 ? 'var(--eq-gain)' : 'var(--eq-loss)'
}

function fmtPct(v) {
  if (v === null || v === undefined) return '—'
  const s = v >= 0 ? '+' : ''
  return `${s}${v.toFixed(2)}%`
}

function fmtPrice(v) {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export default function IndicesPage() {
  const [quotes,   setQuotes]   = useState({})
  const [loading,  setLoading]  = useState(false)
  const [lastFetch,setLastFetch]= useState(null)
  const [filter,   setFilter]   = useState('All')
  const [exchange, setExchange] = useState('All')
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [statusResp, quotesResp] = await Promise.all([
        fetch('/api/market-status'),
        fetch('/api/quotes?tickers=' + ALL_INDICES.map(i => i.symbol).join(',')),
      ])
      const statusData = await statusResp.json()
      const quotesData = await quotesResp.json()
      setStatus(statusData)
      setQuotes(quotesData)
      setLastFetch(new Date())
    } catch {}
    setLoading(false)
  }

  const filtered = ALL_INDICES.filter(idx => {
    if (exchange !== 'All' && idx.exchange !== exchange) return false
    if (filter   !== 'All' && idx.category !== filter) return false
    if (search && !idx.name.toLowerCase().includes(search.toLowerCase()) && !idx.symbol.includes(search.toUpperCase())) return false
    return true
  })

  const sessionBadge = status
    ? status.open ? { label: 'Market Open', color: 'var(--eq-gain)', bg: '#22c55e18' }
    : status.pre_open ? { label: 'Pre-Open', color: 'var(--eq-warn)', bg: '#f59e0b18' }
    : { label: 'Market Closed', color: 'var(--eq-fg3)', bg: 'var(--eq-el)' }
    : null

  return (
    <Layout title="Indices — EQ Portfolio Builder">
      <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">

        {/* header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-eq-acc mb-1">
              Live Market Data
            </div>
            <h1 className="text-2xl font-bold">NSE &amp; BSE Indices</h1>
          </div>
          <div className="flex items-center gap-3">
            {sessionBadge && (
              <span className="text-xs font-mono px-2.5 py-1 rounded border"
                style={{ color: sessionBadge.color, background: sessionBadge.bg, borderColor: sessionBadge.color + '40' }}>
                {sessionBadge.label}
                {status?.time_ist && <span className="ml-1 opacity-70">· {status.time_ist} IST</span>}
              </span>
            )}
            <button onClick={fetchAll} disabled={loading}
              className="text-xs px-3 py-1.5 border border-eq-border rounded text-eq-fg2 hover:text-eq-fg hover:border-eq-border2 disabled:opacity-50 transition-colors">
              {loading ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {/* filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search index…"
            className="bg-eq-el border border-eq-border rounded px-3 py-1.5 text-sm w-44 focus:outline-none focus:border-eq-border2" />

          <div className="flex gap-1 border border-eq-border rounded-lg overflow-hidden">
            {['All', 'NSE', 'BSE'].map(ex => (
              <button key={ex} onClick={() => setExchange(ex)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${exchange === ex ? 'bg-eq-acc text-white' : 'text-eq-fg2 hover:text-eq-fg hover:bg-eq-hover'}`}>
                {ex}
              </button>
            ))}
          </div>

          <div className="flex gap-1 border border-eq-border rounded-lg overflow-hidden">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${filter === cat ? 'bg-eq-acc text-white' : 'text-eq-fg2 hover:text-eq-fg hover:bg-eq-hover'}`}>
                {cat}
              </button>
            ))}
          </div>

          <span className="text-xs text-eq-fg3 ml-auto">{filtered.length} indices</span>
        </div>

        {/* table */}
        <div className="border border-eq-border rounded-lg overflow-hidden bg-eq-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-eq-border bg-eq-bg2">
                <th className="px-4 py-3 text-left text-xs font-medium text-eq-fg2 w-12">Exch</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-eq-fg2">Index</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-eq-fg2 hidden sm:table-cell">Category</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-eq-fg2">Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-eq-fg2">Day Chg</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-eq-fg2 hidden md:table-cell">High</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-eq-fg2 hidden md:table-cell">Low</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(idx => {
                const q = quotes[idx.symbol]
                const hasData = q && !q.error
                return (
                  <tr key={idx.symbol} className="border-t border-eq-border hover:bg-eq-hover transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold font-mono text-eq-fg3">{idx.exchange}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{idx.name}</div>
                      <div className="text-xs font-mono text-eq-fg3">{idx.symbol}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded bg-eq-el text-eq-fg3">{idx.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {loading && !hasData ? (
                        <span className="text-eq-fg3">…</span>
                      ) : hasData ? fmtPrice(q.price) : (
                        <span className="text-xs text-eq-fg3">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {hasData ? (
                        <span style={{ color: pctColor(q.change_pct) }}>
                          {fmtPct(q.change_pct)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-eq-fg2 hidden md:table-cell">
                      {hasData ? fmtPrice(q.day_high) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-eq-fg2 hidden md:table-cell">
                      {hasData ? fmtPrice(q.day_low) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {lastFetch && (
          <p className="text-xs text-eq-fg3 font-mono text-right">
            Last fetched {lastFetch.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
            · Some indices may return N/A if not listed on Yahoo Finance
          </p>
        )}

      </div>
    </Layout>
  )
}
