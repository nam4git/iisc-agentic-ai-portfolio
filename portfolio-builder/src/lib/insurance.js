/**
 * Portfolio Insurance Library
 *
 * Methods implemented:
 *   CPPI   — Black & Jones (1987) "Simplifying Portfolio Insurance"
 *   BS Put — Black & Scholes (1973) for protective-put cost estimation
 *
 * Portfolio Heat concept:
 *   Heat = Σ (position_weight × position_risk%) across all holdings
 *   Measures total open risk as a fraction of the portfolio.
 */

// ─── Portfolio Heat ───────────────────────────────────────────────────────────

/**
 * Compute portfolio heat (total open risk as % of portfolio)
 * positions: [{ weight_pct: 20, risk_pct: 2 }, ...]
 *   weight_pct = portfolio weight (0–100)
 *   risk_pct   = % drop from entry to stop-loss
 */
export function portfolioHeat(positions) {
  return positions.reduce((s, p) => s + (p.weight_pct / 100) * (p.risk_pct / 100) * 100, 0)
}

/** Classify heat level */
export function heatLabel(heat) {
  if (heat < 5)  return { label: 'Cool',   color: '#22c55e', bg: '#22c55e18' }
  if (heat < 10) return { label: 'Warm',   color: '#84cc16', bg: '#84cc1618' }
  if (heat < 15) return { label: 'Hot',    color: '#f59e0b', bg: '#f59e0b18' }
  if (heat < 20) return { label: 'Danger', color: '#ef4444', bg: '#ef444418' }
  return           { label: 'Critical', color: '#dc2626', bg: '#dc262618' }
}

// ─── CPPI Simulation ──────────────────────────────────────────────────────────

/**
 * Simulate CPPI over a price series.
 *
 * prices      : daily price/index level (length = number of days)
 * floor_pct   : protection floor as fraction of initial value (e.g., 0.80 = 80%)
 * multiplier  : CPPI leverage on cushion (typical 3–5)
 * rf_annual   : risk-free rate used for bond growth
 *
 * Returns array of daily state snapshots.
 */
export function simulateCPPI(prices, { floor_pct = 0.80, multiplier = 3, rf_annual = 0.07 } = {}) {
  const T          = prices.length
  if (T < 2) return []

  const rf_daily   = rf_annual / 252
  const V0         = 100          // normalised initial portfolio value
  const floor      = V0 * floor_pct

  let V_pf         = V0           // CPPI portfolio value
  let V_bah        = V0           // buy-and-hold portfolio value

  const cushion0   = Math.max(V_pf - floor, 0)
  let risky        = Math.min(multiplier * cushion0, V_pf)
  let bond         = V_pf - risky

  const series = [{
    day: 0, cppi: V_pf, bah: V_bah, floor,
    cushion: cushion0,
    risky_alloc: V_pf > 0 ? risky / V_pf : 0,
  }]

  for (let t = 1; t < T; t++) {
    const ret = prices[t] / prices[t - 1] - 1

    risky  *= (1 + ret)
    bond   *= (1 + rf_daily)
    V_pf    = risky + bond
    V_bah  *= (1 + ret)

    // Daily rebalance
    const cushion = Math.max(V_pf - floor, 0)
    risky = Math.min(multiplier * cushion, V_pf)
    bond  = V_pf - risky

    series.push({
      day:  t,
      cppi: +V_pf.toFixed(4),
      bah:  +V_bah.toFixed(4),
      floor,
      cushion: +cushion.toFixed(4),
      risky_alloc: V_pf > 0 ? +(risky / V_pf).toFixed(3) : 0,
    })
  }

  return series
}

// ─── Option-based insurance ───────────────────────────────────────────────────

/**
 * Black-Scholes European put price.
 * S         : current portfolio value
 * K         : strike = S × protection_pct
 * T_years   : horizon in years
 * r         : risk-free rate
 * sigma     : annual portfolio volatility (e.g., 0.20 for 20%)
 */
export function bsPutPrice(S, K, T_years, r, sigma) {
  if (T_years <= 0 || sigma <= 0 || S <= 0) return Math.max(K - S, 0)
  const sqrtT = Math.sqrt(T_years)
  const d1    = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T_years) / (sigma * sqrtT)
  const d2    = d1 - sigma * sqrtT
  return K * Math.exp(-r * T_years) * normCDF(-d2) - S * normCDF(-d1)
}

/**
 * Summarises the cost of put-based portfolio insurance.
 */
export function optionInsuranceCost(portfolio_value, protection_pct, vol, T_years, rf = 0.07) {
  const S          = portfolio_value
  const K          = S * protection_pct
  const put_price  = bsPutPrice(S, K, T_years, rf, vol)
  return {
    put_price:    +put_price.toFixed(2),
    cost_pct:     +(put_price / S * 100).toFixed(3),   // % of portfolio
    annual_drag:  +(put_price / S * 100 / T_years).toFixed(3),
    strike:       +K.toFixed(2),
    breakeven:    +(S - put_price).toFixed(2),
  }
}

// ─── GBM simulation (demo / offline mode) ────────────────────────────────────

/**
 * Simulate a single Geometric Brownian Motion path.
 * Returns an array of `days` price levels starting at S0.
 */
export function simulateGBM(S0 = 100, mu = 0.12, sigma = 0.18, days = 252) {
  const dt    = 1 / 252
  const path  = [S0]
  const rng   = lcgNormal(42)

  for (let t = 1; t <= days; t++) {
    const last = path[path.length - 1]
    path.push(last * Math.exp((mu - sigma * sigma / 2) * dt + sigma * Math.sqrt(dt) * rng()))
  }
  return path
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

/** Normal CDF — Abramowitz & Stegun rational approximation (max error < 1.5×10⁻⁷) */
function normCDF(x) {
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429]
  const p = 0.3275911
  const sign = x < 0 ? -1 : 1
  const t    = 1 / (1 + p * Math.abs(x))
  let poly   = 0
  for (let i = 4; i >= 0; i--) poly = poly * t + a[i]
  return 0.5 * (1 + sign * (1 - poly * t * Math.exp(-x * x)))
}

/** Seeded LCG normal RNG via Box-Muller transform */
function lcgNormal(seed) {
  let s = seed >>> 0
  const uniform = () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0
    return (s >>> 0) / 0x100000000
  }
  let spare = null
  return () => {
    if (spare !== null) { const v = spare; spare = null; return v }
    let u1, u2
    do { u1 = uniform() } while (u1 < 1e-10)
    u2       = uniform()
    const mag = Math.sqrt(-2 * Math.log(u1))
    spare     = mag * Math.sin(2 * Math.PI * u2)
    return      mag * Math.cos(2 * Math.PI * u2)
  }
}
