// Pure functions — matches SDD spec Section 5
// Each function is stateless: identical inputs always produce identical outputs

import { DB, SECTOR_COLOR } from './stocks'

const RF_RATE = 7.0 // Indian 91-day T-bill proxy, %

// alloc(h, portfolio) = h.weight / totalWeight(portfolio)
export function alloc(holding, portfolio) {
  const tw = totalWeight(portfolio)
  return tw === 0 ? 0 : holding.weight / tw
}

// totalWeight(portfolio) = Σ h.weight
export function totalWeight(portfolio) {
  return portfolio.reduce((s, h) => s + h.weight, 0)
}

// Enrich each holding with its stock record and allocation fraction
export function enrich(portfolio) {
  const tw = totalWeight(portfolio) || 1
  return portfolio.map(h => ({
    ...h,
    ...(DB[h.ticker] || {}),
    alloc: h.weight / tw,
  }))
}

// weightedReturn(S) = Σ alloc(h) × db[h].ret
export function weightedReturn(portfolio) {
  return enrich(portfolio).reduce((s, d) => s + d.alloc * (d.ret ?? 0), 0)
}

// weightedBeta(S) = Σ alloc(h) × db[h].beta
export function weightedBeta(portfolio) {
  return enrich(portfolio).reduce((s, d) => s + d.alloc * (d.beta ?? 1), 0)
}

// weightedVol(S) = Σ alloc(h) × db[h].vol
export function weightedVol(portfolio) {
  return enrich(portfolio).reduce((s, d) => s + d.alloc * (d.vol ?? 25), 0)
}

// sharpe(S) = (weightedReturn(S) - RF) / weightedVol(S)
export function sharpe(portfolio) {
  const vol = weightedVol(portfolio)
  return vol === 0 ? 0 : (weightedReturn(portfolio) - RF_RATE) / vol
}

// All metrics in one pass — avoids multiple traversals
export function calcMetrics(portfolio) {
  const data = enrich(portfolio)
  const tw = totalWeight(portfolio)
  const wRet  = data.reduce((s, d) => s + d.alloc * (d.ret  ?? 0), 0)
  const wBeta = data.reduce((s, d) => s + d.alloc * (d.beta ?? 1), 0)
  const wVol  = data.reduce((s, d) => s + d.alloc * (d.vol  ?? 25), 0)
  const sh    = wVol === 0 ? 0 : (wRet - RF_RATE) / wVol
  return { data, tw, wRet, wBeta, wVol, sharpe: sh }
}

// sectorAlloc(S) — returns [{name, pct, color}] sorted by pct desc
export function sectorBreakdown(portfolio) {
  const tw = totalWeight(portfolio) || 1
  const map = {}
  enrich(portfolio).forEach(d => {
    const s = d.sector || 'Other'
    map[s] = (map[s] || 0) + (d.weight / tw) * 100
  })
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([name, pct]) => ({ name, pct, color: SECTOR_COLOR[name] || '#888' }))
}

// Validate AddStock pre-conditions — returns error string or null
export function validateAdd(ticker, weight, portfolio) {
  if (!ticker) return 'Enter a ticker'
  if (!DB[ticker]) return `${ticker} not in database`
  if (portfolio.find(h => h.ticker === ticker)) return `${ticker} already in portfolio`
  const w = parseFloat(weight)
  if (isNaN(w) || w <= 0) return 'Weight must be > 0'
  return null
}

// Normalise — scales all weights so they sum to 100 (spec: Normalise post-condition)
export function normalise(portfolio) {
  const tw = totalWeight(portfolio)
  if (tw === 0) return portfolio
  return portfolio.map(h => ({
    ...h,
    weight: parseFloat((h.weight / tw * 100).toFixed(2)),
  }))
}
