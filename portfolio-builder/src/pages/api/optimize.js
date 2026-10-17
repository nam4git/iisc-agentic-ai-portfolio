/**
 * POST /api/optimize
 * Body: { tickers: ['HDFCBANK', 'RELIANCE', ...] }
 *
 * Fetches 1-year daily history from Yahoo Finance, computes covariance matrix,
 * runs 5 academic optimization algorithms, and returns weights + efficient frontier.
 */

import { fetchHistory as fetchHistoryLib } from '../../lib/yahoo'
import {
  buildCovMatrix,
  buildCorrMatrix,
  computeAnnualizedMeans,
  minVariance,
  maxSharpe,
  equalRiskContribution,
  hierarchicalRiskParity,
  minCVaR,
  portfolioStats,
  riskContributions,
  portfolioVol,
} from '../../lib/optimize'

const METHODS = [
  { key: 'min_var',    name: 'Minimum Variance',        ref: 'Markowitz (1952)',                       color: '#4a84d9' },
  { key: 'max_sharpe', name: 'Maximum Sharpe Ratio',     ref: 'Sharpe (1966)',                          color: '#34d399' },
  { key: 'erc',        name: 'Equal Risk Contribution',  ref: 'Maillard, Roncalli & Teïletche (2010)', color: '#fb923c' },
  { key: 'hrp',        name: 'Hier. Risk Parity',        ref: 'López de Prado (2016)',                  color: '#a78bfa' },
  { key: 'min_cvar',   name: 'Min CVaR (α=5%)',          ref: 'Rockafellar & Uryasev (2000)',           color: '#f472b6' },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tickers } = req.body || {}
  if (!tickers || tickers.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 tickers.' })
  }

  const end   = new Date()
  const start = new Date()
  start.setFullYear(start.getFullYear() - 1)

  // Fetch 1yr daily history in parallel
  const fetches = await Promise.allSettled(
    tickers.map(ticker => fetchHistory(ticker, start, end))
  )

  // Build aligned price matrix
  const valid  = []
  const pricesByTicker = {}

  for (let i = 0; i < tickers.length; i++) {
    const r = fetches[i]
    if (r.status === 'fulfilled' && r.value.length >= 60) {
      const t = tickers[i].toUpperCase()
      valid.push(t)
      pricesByTicker[t] = r.value
    }
  }

  if (valid.length < 2) {
    return res.status(400).json({ error: 'Could not fetch sufficient price history. Try common NSE tickers like RELIANCE, HDFCBANK, INFY.' })
  }

  // Common trading dates
  const dateSets   = valid.map(t => new Set(pricesByTicker[t].map(d => d.date)))
  let commonDates  = [...dateSets[0]].filter(d => dateSets.every(s => s.has(d)))
  commonDates.sort()

  if (commonDates.length < 50) {
    return res.status(400).json({ error: 'Too few overlapping trading days across tickers.' })
  }

  // Daily log returns matrix (row = asset)
  const returnMatrix = valid.map(t => {
    const priceMap = Object.fromEntries(pricesByTicker[t].map(d => [d.date, d.close]))
    const prices   = commonDates.map(d => priceMap[d]).filter(p => p > 0)
    const rets     = []
    for (let i = 1; i < prices.length; i++) {
      rets.push(prices[i - 1] > 0 ? Math.log(prices[i] / prices[i - 1]) : 0)
    }
    return rets
  })

  const cov  = buildCovMatrix(returnMatrix)
  const corr = buildCorrMatrix(cov)
  const mu   = computeAnnualizedMeans(returnMatrix)
  const vols = cov.map((row, i) => Math.sqrt(Math.max(row[i], 0)) * Math.sqrt(252))

  // Run all 5 methods
  const methodWeights = {
    min_var:    minVariance(cov),
    max_sharpe: maxSharpe(cov, mu),
    erc:        equalRiskContribution(cov),
    hrp:        hierarchicalRiskParity(cov),
    min_cvar:   minCVaR(returnMatrix),
  }

  const optimized = {}
  for (const m of METHODS) {
    const w      = methodWeights[m.key]
    const stats  = portfolioStats(w, mu, cov)
    const rc     = riskContributions(w, cov)
    const sigma  = portfolioVol(w, cov)
    optimized[m.key] = {
      name:   m.name,
      ref:    m.ref,
      color:  m.color,
      weights: Object.fromEntries(valid.map((t, i) => [t, +w[i].toFixed(4)])),
      risk_contributions: Object.fromEntries(valid.map((t, i) => [t, sigma > 0 ? +(rc[i] / sigma * 100).toFixed(2) : 0])),
      stats: {
        ret:    +(stats.ret * 100).toFixed(2),
        vol:    +(stats.vol * 100).toFixed(2),
        sharpe: +stats.sharpe.toFixed(3),
      },
    }
  }

  // Monte Carlo frontier (300 random portfolios)
  const frontier = Array.from({ length: 300 }, () => {
    const raw  = valid.map(() => Math.random() + 0.05)
    const sum  = raw.reduce((s, v) => s + v, 0)
    const w    = raw.map(v => v / sum)
    const s    = portfolioStats(w, mu, cov)
    return { vol: +(s.vol * 100).toFixed(2), ret: +(s.ret * 100).toFixed(2), sharpe: +s.sharpe.toFixed(3) }
  })

  return res.status(200).json({
    tickers:  valid,
    corr:     corr.map(row => row.map(v => +v.toFixed(3))),
    mu:       mu.map(m => +(m * 100).toFixed(2)),
    vols:     vols.map(v => +(v * 100).toFixed(2)),
    optimized,
    frontier,
    data_period: `${commonDates[0]} → ${commonDates[commonDates.length - 1]}`,
    trading_days: commonDates.length,
  })
}

async function fetchHistory(ticker, start, end) {
  return fetchHistoryLib(ticker, start, end)
}
