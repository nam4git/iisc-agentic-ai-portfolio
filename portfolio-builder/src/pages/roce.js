import { useState, useRef } from 'react'
import Layout from '../components/Layout'
import ROCEHistory from '../components/portfolio/ROCEHistory'

const SUGGESTED = ['ZOMATO', 'NYKAA', 'POLICYBZR', 'MAPMYINDIA', 'LATENTVIEW']

const CSV_TEMPLATE = `quarter,ebit_cr,current_assets_cr,cash_cr,current_liabilities_cr,net_ppe_cr,other_intangibles_cr
Q1FY25,850,12500,1200,6800,18000,900
Q4FY24,780,11800,950,6200,17500,880
Q3FY24,700,11200,1100,5900,17100,850
Q2FY24,650,10800,800,5700,16800,820`

function parseCsvRoce(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const header = lines[0].split(',').map(h => h.trim())
  const idxOf = k => header.indexOf(k)
  return lines.slice(1).map(line => {
    const row = line.split(',')
    const quarter = row[0].trim()
    const ebit  = parseFloat(row[idxOf('ebit_cr')]) * 1e7
    const ca    = parseFloat(row[idxOf('current_assets_cr')]) * 1e7
    const cash  = parseFloat(row[idxOf('cash_cr')]) * 1e7
    const cl    = parseFloat(row[idxOf('current_liabilities_cr')]) * 1e7
    const ppe   = parseFloat(row[idxOf('net_ppe_cr')]) * 1e7
    const ia    = parseFloat(row[idxOf('other_intangibles_cr')]) * 1e7
    const nca = Math.max(ca - cash, 0)
    const nwc = nca - cl
    const nfa = ppe + Math.max(ia, 0)
    const tce = nfa + nwc
    const roce = tce !== 0 ? parseFloat(((ebit / tce) * 100).toFixed(2)) : null
    return { quarter, ebit, tce, nwc, nfa, roce,
      breakdown: { current_assets: ca, cash, nca, current_liab: cl, net_ppe: ppe, intangibles_included: ia, goodwill_excluded: 0 } }
  }).filter(r => !isNaN(r.roce))
}

function fmtCr(n) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return `₹${(n / 1e7).toFixed(0)} Cr`
}

function RoceValue({ roce }) {
  if (roce === null || roce === undefined) return <span className="text-eq-fg3">—</span>
  const color = roce >= 20 ? '#22c55e' : roce >= 15 ? '#d97706' : '#ef4444'
  return <span className="font-mono font-semibold" style={{ color }}>{roce.toFixed(1)}%</span>
}

export default function ROCEPage() {
  const [query, setQuery]     = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')
  const [uploadMode, setUploadMode] = useState(false)
  const [selectedQ, setSelectedQ]   = useState(0)
  const fileRef = useRef()

  async function fetchRoce(ticker) {
    if (!ticker.trim()) return
    setLoading(true); setError(''); setResult(null); setUploadMode(false)
    try {
      const resp = await fetch(`/api/roce/${ticker.trim().toUpperCase()}`)
      const data = await resp.json()
      if (data.upload_required || data.error === 'not_found') {
        setUploadMode(true)
        setError(data.message || 'No data found.')
      } else if (data.error) {
        setError(data.error)
      } else {
        setResult(data); setSelectedQ(0)
      }
    } catch { setError('Network error.') }
    finally { setLoading(false) }
  }

  function handleFile(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const rows = parseCsvRoce(ev.target.result)
      if (!rows.length) { setError('CSV parse failed — check column headers.'); return }
      const rocs = rows.map(r => r.roce).filter(Boolean)
      const trend = rocs.length >= 2
        ? (rocs[0] > rocs[rocs.length-1] ? 'IMPROVING' : rocs[0] < rocs[rocs.length-1] ? 'DECLINING' : 'FLAT')
        : 'INSUFFICIENT_DATA'
      setResult({ ticker: query.toUpperCase() || 'UPLOAD', name: query.toUpperCase() || 'Uploaded',
        current: rows[0], history: rows, trend, source: 'CSV upload' })
      setSelectedQ(0); setUploadMode(false); setError('')
    }
    reader.readAsText(file)
  }

  const pt = result?.history?.[selectedQ]
  const trendColor = { IMPROVING: '#22c55e', FLAT: '#d97706', DECLINING: '#ef4444', INSUFFICIENT_DATA: '#3e3e52' }

  return (
    <Layout title="ROCE — EQ Portfolio Builder">
      <div className="max-w-3xl mx-auto px-5 py-8 space-y-8">

        <div>
          <h1 className="text-xl font-semibold mb-1">ROCE Calculator</h1>
          <p className="text-sm text-eq-fg2">
            Fetches quarterly P&L and Balance Sheet from NSE via Yahoo Finance. Falls back to CSV upload.
          </p>
        </div>

        {/* formula */}
        <div className="border border-eq-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-eq-border text-sm font-medium">Formula</div>
          <div className="px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-1 font-mono text-xs text-eq-fg2">
            {[
              ['NCA', '= Current Assets − Cash'],
              ['NWC', '= NCA − Current Liabilities'],
              ['NFA', '= Net PPE + Other Intangibles'],
              ['TCE', '= NFA + NWC'],
              ['EBIT', '= TTM (last 4 quarters, annualised)'],
              ['ROCE', '= EBIT / TCE × 100'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2 py-0.5">
                <span className="text-eq-fg w-12">{k}</span><span>{v}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 bg-eq-el/30 border-t border-eq-border text-xs text-eq-fg3 font-mono">
            Goodwill excluded. Other intangibles included (Lev-Sougiannis / Peters-Taylor).
          </div>
        </div>

        {/* search */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && fetchRoce(query)}
              placeholder="NSE ticker  e.g. ZOMATO"
              className="flex-1 bg-eq-el border border-eq-border rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-eq-border2"
            />
            <button onClick={() => fetchRoce(query)} disabled={loading || !query}
              className="px-5 py-2 bg-eq-acc text-white rounded text-sm font-medium hover:bg-eq-acc/90 disabled:opacity-40 transition-colors">
              {loading ? '…' : 'Fetch'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-eq-fg3">IPO Index:</span>
            {SUGGESTED.map(s => (
              <button key={s} onClick={() => { setQuery(s); fetchRoce(s) }}
                className="text-xs font-mono px-2 py-0.5 border border-eq-border rounded text-eq-fg2 hover:text-eq-fg hover:border-eq-border2 transition-colors">
                {s}
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-eq-loss font-mono">{error}</p>}
        </div>

        {/* upload fallback */}
        {uploadMode && (
          <div className="border border-eq-warn/30 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-eq-warn/20 text-sm font-medium text-eq-warn">
              Not found on Yahoo Finance — upload CSV
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-sm text-eq-fg2">
                Upload a CSV with quarterly financials. Values in Crores. Match column headers exactly.
              </p>
              <pre className="font-mono text-xs text-eq-fg3 bg-eq-el rounded px-3 py-2 overflow-x-auto">{CSV_TEMPLATE}</pre>
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()}
                  className="px-4 py-1.5 border border-eq-border rounded text-sm text-eq-fg2 hover:text-eq-fg transition-colors">
                  Choose file
                </button>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
                <button onClick={() => {
                  const a = document.createElement('a')
                  a.href = 'data:text/csv,' + encodeURIComponent(CSV_TEMPLATE)
                  a.download = 'roce_template.csv'; a.click()
                }} className="text-xs text-eq-fg3 hover:text-eq-fg2 transition-colors self-center">
                  Download template
                </button>
              </div>
            </div>
          </div>
        )}

        {/* results */}
        {result && (
          <div className="space-y-5">

            {/* summary */}
            <div className="border border-eq-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold">{result.name}</div>
                  <div className="text-xs text-eq-fg3 font-mono mt-0.5">{result.ticker} · {result.source}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-mono font-semibold">
                    <RoceValue roce={result.current?.roce} />
                  </div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: trendColor[result.trend] }}>
                    {result.trend?.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* A2 gate */}
              <div className="border-t border-eq-border pt-3 space-y-1 text-xs font-mono text-eq-fg2">
                <div className="text-eq-fg3 mb-1">A2 gate G2</div>
                {(() => {
                  const r = result.current?.roce
                  const t = result.trend
                  const A = r > 15 && t === 'IMPROVING'
                  const B = r > 12
                  return <>
                    <div className={A ? 'text-eq-gain' : 'text-eq-fg3'}>
                      {A ? '✓' : '✗'}  Path A: ROCE &gt; 15% and IMPROVING — {r?.toFixed(1)}% / {t}
                    </div>
                    <div className={B ? 'text-eq-warn' : 'text-eq-fg3'}>
                      {B ? '~' : '✗'}  Path B: ROCE &gt; 12% and peer ≥ 60th pct — {r?.toFixed(1)}% / peer data needed
                    </div>
                    <div className="mt-1.5 font-semibold" style={{ color: A ? '#22c55e' : B ? '#d97706' : '#ef4444' }}>
                      Verdict: {A ? 'PASS (Path A)' : B ? 'Conditional — upload peer data' : 'FAIL'}
                    </div>
                  </>
                })()}
              </div>
            </div>

            {/* history chart */}
            {result.history?.length > 1 && (
              <div className="border border-eq-border rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 border-b border-eq-border flex items-center justify-between">
                  <span className="text-sm font-medium">ROCE history</span>
                  <span className="text-xs text-eq-fg3 font-mono">{result.history.length} quarters</span>
                </div>
                <div className="px-4 py-3">
                  <ROCEHistory history={result.history} />
                </div>
                <div className="px-4 py-2 border-t border-eq-border flex gap-4 text-xs text-eq-fg3 font-mono">
                  <span style={{color:'#22c55e'}}>▪ ≥ 20%</span>
                  <span style={{color:'#d97706'}}>▪ ≥ 15%</span>
                  <span style={{color:'#ef4444'}}>▪ &lt; 15%</span>
                  <span className="ml-auto">dashed line = 15% gate</span>
                </div>
              </div>
            )}

            {/* breakdown */}
            <div className="border border-eq-border rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-eq-border flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Breakdown</span>
                {result.history.map((p, i) => (
                  <button key={i} onClick={() => setSelectedQ(i)}
                    className={`text-xs font-mono px-2 py-0.5 rounded border transition-colors ${
                      selectedQ === i ? 'border-eq-acc/50 text-eq-acc2' : 'border-eq-border text-eq-fg3 hover:text-eq-fg'
                    }`}>
                    {p.quarter}
                  </button>
                ))}
              </div>
              {pt && (
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ['Current Assets', pt.breakdown?.current_assets, null],
                      ['  − Cash', -pt.breakdown?.cash, null],
                      ['= NCA', pt.breakdown?.nca, 'Net Current Assets'],
                      ['  − Current Liabilities', -pt.breakdown?.current_liab, null],
                      ['= NWC', pt.nwc, 'Net Working Capital'],
                      [null, null, null],
                      ['Net PPE', pt.breakdown?.net_ppe, null],
                      ['+ Other Intangibles', pt.breakdown?.intangibles_included, 'Goodwill excl.'],
                      ['= NFA', pt.nfa, 'Net Fixed Assets'],
                      [null, null, null],
                      ['Total Capital Employed (TCE)', pt.tce, null],
                      ['EBIT (TTM)', pt.ebit, null],
                    ].map((row, i) => row[0] === null ? (
                      <tr key={i}><td colSpan={3} className="py-1 px-4 border-t border-eq-border/40" /></tr>
                    ) : (
                      <tr key={i} className="border-t border-eq-border/40 hover:bg-eq-el/20">
                        <td className="px-4 py-2 text-xs text-eq-fg2 font-mono">{row[0]}</td>
                        <td className="px-4 py-2 text-xs font-mono text-right text-eq-fg">{fmtCr(row[1])}</td>
                        <td className="px-4 py-2 text-xs text-eq-fg3">{row[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-eq-border bg-eq-el/30">
                      <td className="px-4 py-2.5 text-sm font-semibold">ROCE</td>
                      <td className="px-4 py-2.5 text-right"><RoceValue roce={pt.roce} /></td>
                      <td className="px-4 py-2.5 text-xs text-eq-fg3 font-mono">EBIT / TCE × 100</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

          </div>
        )}
      </div>
    </Layout>
  )
}
