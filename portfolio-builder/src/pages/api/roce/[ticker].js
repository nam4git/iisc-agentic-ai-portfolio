/**
 * GET /api/roce/[ticker]
 * Uses yahoo-finance2 (reliable on Vercel serverless; no raw API scraping)
 *
 * Formula:
 *   NCA  = Current Assets − Cash & Equivalents
 *   NWC  = NCA − Current Liabilities
 *   NFA  = Net PPE + Other Intangibles (Goodwill excluded)
 *   TCE  = NFA + NWC
 *   EBIT = TTM sum of last 4 quarterly EBITs
 *   ROCE = EBIT / TCE × 100
 */

import yahooFinance from 'yahoo-finance2'

export default async function handler(req, res) {
  const { ticker } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker required' })

  const t = ticker.toUpperCase()
  const symbol = t.endsWith('.NS') || t.endsWith('.BO') ? t : `${t}.NS`

  try {
    const data = await fetchRoce(symbol)
    res.setHeader('Cache-Control', 'public, max-age=900') // 15 min cache
    return res.status(200).json(data)
  } catch {
    if (symbol.endsWith('.NS')) {
      try {
        const data = await fetchRoce(symbol.replace('.NS', '.BO'))
        res.setHeader('Cache-Control', 'public, max-age=900')
        return res.status(200).json(data)
      } catch {}
    }
    return res.status(404).json({
      error: 'not_found',
      message: `No financial data for ${symbol}. Try uploading a CSV with quarterly financials.`,
      upload_required: true,
    })
  }
}

async function fetchRoce(symbol) {
  const result = await yahooFinance.quoteSummary(symbol, {
    modules: ['incomeStatementHistoryQuarterly', 'balanceSheetHistoryQuarterly', 'price'],
  })

  const name = result.price?.shortName || result.price?.longName || symbol

  const qBS = [...(result.balanceSheetHistoryQuarterly?.balanceSheetStatements || [])]
    .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))

  const qIS = [...(result.incomeStatementHistoryQuarterly?.incomeStatementHistory || [])]
    .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))

  // Index IS by quarter label for fast lookup
  const isMap = new Map()
  for (const stmt of qIS) isMap.set(quarterLabel(stmt.endDate), stmt)

  const history = []

  for (let i = 0; i < Math.min(qBS.length, 8); i++) {
    const bs = qBS[i]
    const key = quarterLabel(bs.endDate)
    const is = isMap.get(key)
    if (!is) continue

    // yahoo-finance2 returns direct numbers (no .raw needed)
    const currentAssets = safeNum(bs.totalCurrentAssets)
    const cash          = safeNum(bs.cash) + safeNum(bs.shortTermInvestments)
    const currentLiab   = safeNum(bs.totalCurrentLiabilities)
    const netPPE        = safeNum(bs.propertyPlantEquipment) || safeNum(bs.netTangibleAssets)
    const goodwill      = safeNum(bs.goodwill)
    const intangibles   = Math.max(safeNum(bs.intangibleAssets) - goodwill, 0)

    const nca = Math.max(currentAssets - cash, 0)
    const nwc = nca - currentLiab
    const nfa = netPPE + intangibles
    const tce = nfa + nwc

    const qEbit = safeNum(is.ebit) || safeNum(is.operatingIncome)

    if (tce === 0) continue

    history.push({
      quarter: key,
      date_ts: new Date(bs.endDate).getTime() / 1000,
      q_ebit: qEbit,
      tce, nwc, nfa,
      breakdown: {
        current_assets: currentAssets,
        cash, nca,
        current_liab: currentLiab,
        net_ppe: netPPE,
        intangibles_included: intangibles,
        goodwill_excluded: goodwill,
      },
    })
  }

  // Compute TTM EBIT and ROCE for each quarter
  for (let i = 0; i < history.length; i++) {
    const window = history.slice(i, i + 4)
    const ttmEbit = window.reduce((s, p) => s + p.q_ebit, 0)
    history[i].ebit = ttmEbit
    history[i].roce = history[i].tce !== 0
      ? parseFloat(((ttmEbit / history[i].tce) * 100).toFixed(2))
      : null
  }

  const trend = computeTrend(history)

  return {
    ticker: symbol,
    name,
    current: history[0] || null,
    history,
    trend,
    source: 'Yahoo Finance',
    formula_note: 'ROCE = TTM EBIT / TCE. NFA = Net PPE + Other Intangibles (Goodwill excluded).',
  }
}

function computeTrend(history) {
  if (history.length < 2) return 'INSUFFICIENT_DATA'
  const rocs = history.slice(0, 4).map(p => p.roce).filter(r => r !== null)
  if (rocs.length < 2) return 'INSUFFICIENT_DATA'
  const diffs = rocs.slice(0, -1).map((r, i) => r - rocs[i + 1])
  const avg = diffs.reduce((s, d) => s + d, 0) / diffs.length
  if (avg > 1.0) return 'IMPROVING'
  if (avg < -1.0) return 'DECLINING'
  return 'FLAT'
}

function quarterLabel(dateVal) {
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal)
  const m = d.getMonth() + 1
  const y = d.getFullYear()
  const fy = m >= 4 ? y + 1 : y
  const q = m >= 4 && m <= 6 ? 'Q1' : m >= 7 && m <= 9 ? 'Q2' : m >= 10 ? 'Q3' : 'Q4'
  return `${q}FY${String(fy).slice(2)}`
}

function safeNum(v) {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'object' && 'raw' in v) return v.raw || 0
  return 0
}
