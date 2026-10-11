/**
 * GET /api/roce/[ticker]
 *
 * Fetches quarterly financials from Yahoo Finance (NSE: ticker.NS)
 * and computes ROCE using the formula:
 *
 *   NCA  = Current Assets − Cash & Equivalents
 *   NCL  = Current Liabilities
 *   NWC  = NCA − NCL                           (Net Working Capital)
 *   NFA  = Net PPE + Other Intangibles          (excl. Goodwill by default)
 *   TCE  = NFA + NWC                            (Total Capital Employed)
 *   EBIT = TTM sum of last 4 quarterly EBITs    (annualised)
 *   ROCE = EBIT / TCE × 100
 *
 * Intangibles note: Goodwill excluded by default (acquisition premium ≠ operating
 * capital). Other Intangible Assets included (brands, customer relationships,
 * licenses) per Lev & Sougiannis / Peters & Taylor intangible capital research.
 *
 * Returns JSON:
 *   { ticker, name, current: RocePoint, history: RocePoint[], trend, source }
 *   where RocePoint = { quarter, roce, ebit, tce, nwc, nfa, breakdown }
 */

export default async function handler(req, res) {
  const { ticker } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker required' })

  const symbol = ticker.toUpperCase().endsWith('.NS') || ticker.toUpperCase().endsWith('.BO')
    ? ticker.toUpperCase()
    : `${ticker.toUpperCase()}.NS`

  try {
    const data = await fetchYahooFinancials(symbol)
    return res.status(200).json(data)
  } catch (err) {
    // Try BSE (.BO) if .NS not found
    if (symbol.endsWith('.NS')) {
      try {
        const data = await fetchYahooFinancials(symbol.replace('.NS', '.BO'))
        return res.status(200).json(data)
      } catch (_) {}
    }
    return res.status(404).json({
      error: 'not_found',
      message: `No data for ${symbol}. Try uploading a CSV with your financials.`,
      upload_required: true,
    })
  }
}

async function fetchYahooFinancials(symbol) {
  const modules = [
    'incomeStatementHistoryQuarterly',
    'balanceSheetHistoryQuarterly',
    'incomeStatementHistory',
    'balanceSheetHistory',
    'price',
  ].join(',')

  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`

  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  })

  if (!resp.ok) throw new Error(`Yahoo returned ${resp.status}`)

  const json = await resp.json()
  const result = json?.quoteSummary?.result?.[0]
  if (!result) throw new Error('no result')

  const name = result.price?.shortName || symbol

  // --- quarterly data ---
  const qBS = result.balanceSheetHistoryQuarterly?.balanceSheetStatements || []
  const qIS = result.incomeStatementHistoryQuarterly?.incomeStatementHistory || []

  // Sort both by endDate descending (newest first)
  qBS.sort((a, b) => b.endDate.raw - a.endDate.raw)
  qIS.sort((a, b) => b.endDate.raw - a.endDate.raw)

  // Build quarterly ROCE points (last 8 quarters)
  const history = buildHistory(qBS, qIS)

  // Current ROCE from most recent full quarter
  const current = history[0] || null

  // Trend: compare last 4 vs prior 4 quarters
  const trend = computeTrend(history)

  return {
    ticker: symbol,
    name,
    current,
    history,
    trend,
    source: 'Yahoo Finance',
    formula_note: 'ROCE = TTM EBIT / TCE. NFA = Net PPE + Other Intangibles (Goodwill excluded). NWC = (Current Assets − Cash) − Current Liabilities.',
  }
}

function buildHistory(qBS, qIS) {
  const points = []

  // Match BS and IS by closest quarter date
  const isMap = new Map()
  for (const stmt of qIS) {
    const key = quarterLabel(stmt.endDate.raw)
    isMap.set(key, stmt)
  }

  for (let i = 0; i < Math.min(qBS.length, 8); i++) {
    const bs = qBS[i]
    const key = quarterLabel(bs.endDate.raw)
    const is = isMap.get(key)
    if (!is) continue

    // Balance sheet items (all in native currency — typically INR for .NS)
    const currentAssets = val(bs.totalCurrentAssets)
    const cash         = val(bs.cash) + val(bs.shortTermInvestments)
    const currentLiab  = val(bs.totalCurrentLiabilities)
    const netPPE       = val(bs.propertyPlantEquipmentNet) || val(bs.netTangibleAssets)
    const goodwill     = val(bs.goodWill)
    const intangibles  = val(bs.intangibleAssets) - goodwill  // excl. goodwill

    const nca  = Math.max(currentAssets - cash, 0)
    const nwc  = nca - currentLiab
    const nfa  = netPPE + Math.max(intangibles, 0)
    const tce  = nfa + nwc

    // Income statement: use single quarter EBIT, then annualise via TTM below
    const qEbit = val(is.ebit) || val(is.operatingIncome)

    if (tce === 0) continue

    points.push({
      quarter: key,
      date_ts: bs.endDate.raw,
      q_ebit: qEbit,       // single quarter, used for TTM calculation
      tce,
      nwc,
      nfa,
      breakdown: {
        current_assets: currentAssets,
        cash,
        nca,
        current_liab: currentLiab,
        net_ppe: netPPE,
        intangibles_included: Math.max(intangibles, 0),
        goodwill_excluded: goodwill,
      },
    })
  }

  // Compute TTM EBIT for each point (sum of that quarter + 3 prior)
  for (let i = 0; i < points.length; i++) {
    const window = points.slice(i, i + 4)
    const ttmEbit = window.reduce((s, p) => s + p.q_ebit, 0)
    const tce = points[i].tce
    points[i].ebit = ttmEbit
    points[i].roce = tce !== 0 ? parseFloat(((ttmEbit / tce) * 100).toFixed(2)) : null
  }

  return points
}

function computeTrend(history) {
  if (history.length < 2) return 'INSUFFICIENT_DATA'
  const recent = history.slice(0, Math.min(4, history.length))
  const rocs = recent.map(p => p.roce).filter(r => r !== null)
  if (rocs.length < 2) return 'INSUFFICIENT_DATA'
  const diffs = rocs.slice(0, -1).map((r, i) => r - rocs[i + 1])  // newest - older (positive = improving)
  const avg = diffs.reduce((s, d) => s + d, 0) / diffs.length
  if (avg > 1.0)  return 'IMPROVING'
  if (avg < -1.0) return 'DECLINING'
  return 'FLAT'
}

function quarterLabel(epochSec) {
  const d = new Date(epochSec * 1000)
  const m = d.getMonth() + 1  // 1-12
  const y = d.getFullYear()
  // Indian fiscal year: Apr-Jun = Q1, Jul-Sep = Q2, Oct-Dec = Q3, Jan-Mar = Q4
  const fy = m >= 4 ? y + 1 : y
  const q = m >= 4 && m <= 6 ? 'Q1' : m >= 7 && m <= 9 ? 'Q2' : m >= 10 ? 'Q3' : 'Q4'
  return `${q}FY${String(fy).slice(2)}`
}

function val(field) {
  if (!field) return 0
  if (typeof field === 'number') return field
  return field.raw || 0
}
