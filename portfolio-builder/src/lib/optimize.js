/**
 * Portfolio Optimization Library
 *
 * Inspired by skfolio (https://github.com/skfolio/skfolio, MIT License)
 * For production use install: pip install skfolio
 *
 * References:
 *   Markowitz, H.M. (1952). Portfolio Selection. Journal of Finance.
 *   Sharpe, W.F. (1966). Mutual Fund Performance. Journal of Business.
 *   Maillard, S., Roncalli, T., Teïletche, J. (2010). The Properties of
 *     Equally Weighted Risk Contribution Portfolios. Journal of Portfolio Management.
 *   López de Prado, M. (2016). Building Diversified Portfolios that Outperform
 *     Out-of-Sample. Journal of Portfolio Management.
 *   Rockafellar, R.T., Uryasev, S. (2000). Optimization of Conditional
 *     Value-at-Risk. Journal of Risk.
 */

const RF       = 0.07   // India 91-day T-bill proxy (annualized %)
const TRADING  = 252    // trading days per year

// ─── Return statistics ────────────────────────────────────────────────────────

/** Annualized mean returns from daily log return matrix (row = asset) */
export function computeAnnualizedMeans(returnMatrix) {
  return returnMatrix.map(row => {
    const T = row.length
    if (T === 0) return 0
    return (row.reduce((s, r) => s + r, 0) / T) * TRADING
  })
}

/** Annualized covariance matrix from daily log return matrix */
export function buildCovMatrix(returnMatrix) {
  const n   = returnMatrix.length
  const T   = returnMatrix[0].length
  const mu  = returnMatrix.map(row => row.reduce((s, r) => s + r, 0) / T)

  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let s = 0
      for (let k = 0; k < T; k++) {
        s += (returnMatrix[i][k] - mu[i]) * (returnMatrix[j][k] - mu[j])
      }
      return (s / (T - 1)) * TRADING
    })
  )
}

/** Pearson correlation matrix from covariance matrix */
export function buildCorrMatrix(cov) {
  const n    = cov.length
  const vols = cov.map((row, i) => Math.sqrt(Math.max(row[i], 0)))
  return cov.map((row, i) =>
    row.map((v, j) => {
      const d = vols[i] * vols[j]
      return d > 1e-12 ? Math.min(Math.max(v / d, -1), 1) : (i === j ? 1 : 0)
    })
  )
}

// ─── Linear algebra ───────────────────────────────────────────────────────────

function matVec(M, v) {
  return M.map(row => row.reduce((s, m, j) => s + m * v[j], 0))
}

function dot(a, b) {
  return a.reduce((s, v, i) => s + v * b[i], 0)
}

export function portfolioVol(w, cov) {
  let v = 0
  for (let i = 0; i < w.length; i++)
    for (let j = 0; j < w.length; j++)
      v += w[i] * w[j] * cov[i][j]
  return Math.sqrt(Math.max(v, 0))
}

/** Project onto probability simplex (long-only, fully-invested) */
function projectSimplex(w) {
  const n      = w.length
  const sorted = [...w].sort((a, b) => b - a)
  let cumSum = 0, rho = 0
  for (let i = 0; i < n; i++) {
    cumSum += sorted[i]
    if (sorted[i] - (cumSum - 1) / (i + 1) > 0) rho = i
  }
  const theta = (sorted.slice(0, rho + 1).reduce((s, v) => s + v, 0) - 1) / (rho + 1)
  return w.map(v => Math.max(v - theta, 0))
}

/** Matrix inversion via Gauss-Jordan with Tikhonov regularization */
function invertMatrix(M) {
  const n = M.length
  // Add small diagonal regularization (Tikhonov / ridge)
  const aug = M.map((row, i) => [
    ...row.map((v, j) => v + (i === j ? 1e-8 : 0)),
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ])

  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > Math.abs(aug[maxRow][col])) maxRow = r
    }
    ;[aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]

    const pivot = aug[col][col]
    if (Math.abs(pivot) < 1e-14) continue
    for (let k = 0; k < 2 * n; k++) aug[col][k] /= pivot

    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = aug[r][col]
      for (let k = 0; k < 2 * n; k++) aug[r][k] -= f * aug[col][k]
    }
  }
  return aug.map(row => row.slice(n))
}

// ─── Optimization methods ─────────────────────────────────────────────────────

/**
 * Minimum Variance Portfolio  (Markowitz 1952)
 * Closed-form: w* = Σ⁻¹1 / (1'Σ⁻¹1)
 * Post-projected onto the simplex for long-only constraint.
 */
export function minVariance(cov) {
  const n      = cov.length
  const invCov = invertMatrix(cov)
  const ones   = Array(n).fill(1)
  const z      = matVec(invCov, ones)
  const zSum   = z.reduce((s, v) => s + v, 0)
  if (zSum <= 0) return Array(n).fill(1 / n)
  return projectSimplex(z.map(v => v / zSum))
}

/**
 * Maximum Sharpe Ratio Portfolio  (Sharpe 1966)
 * Tangency portfolio: w ∝ Σ⁻¹(μ − rf)
 */
export function maxSharpe(cov, mu, rf = RF) {
  const n      = cov.length
  const excess = mu.map(m => m - rf)
  const invCov = invertMatrix(cov)
  const z      = matVec(invCov, excess)
  const zSum   = z.reduce((s, v) => s + v, 0)
  if (zSum <= 0) return minVariance(cov)   // degenerate case
  return projectSimplex(z.map(v => v / zSum))
}

/**
 * Equal Risk Contribution (Risk Parity)  (Maillard, Roncalli & Teïletche 2010)
 * Iterative Newton-Raphson: each asset's contribution to portfolio risk is equal.
 */
export function equalRiskContribution(cov) {
  const n = cov.length
  let w   = Array(n).fill(1 / n)

  for (let iter = 0; iter < 3000; iter++) {
    const sigma  = portfolioVol(w, cov)
    if (sigma < 1e-12) break
    const Sw     = matVec(cov, w)
    const rc     = w.map((wi, i) => wi * Sw[i] / sigma)
    const target = (sigma * sigma) / n  // equal contribution

    let maxDiff  = 0
    const newW   = w.map((wi, i) => {
      const grad    = 2 * Sw[i]
      if (Math.abs(grad * wi) < 1e-14) return wi
      const delta   = 0.05 * (rc[i] - target) / (grad * wi)
      const updated = Math.max(wi - delta, 1e-8)
      maxDiff = Math.max(maxDiff, Math.abs(updated - wi))
      return updated
    })

    const sum = newW.reduce((s, v) => s + v, 0)
    w = newW.map(v => v / sum)
    if (maxDiff < 1e-10) break
  }

  return w
}

/**
 * Hierarchical Risk Parity  (López de Prado 2016)
 * 1. Compute distance matrix from correlation matrix
 * 2. Greedy nearest-neighbour seriation (leaf ordering)
 * 3. Recursive bisection with IVP cluster weights
 */
export function hierarchicalRiskParity(cov) {
  const n = cov.length
  if (n === 1) return [1]
  if (n === 2) {
    const v0 = cov[0][0], v1 = cov[1][1]
    const sum = (v0 > 0 ? 1 / v0 : 0) + (v1 > 0 ? 1 / v1 : 0)
    return sum > 0 ? [(v0 > 0 ? 1 / v0 : 0) / sum, (v1 > 0 ? 1 / v1 : 0) / sum] : [0.5, 0.5]
  }

  const corr = buildCorrMatrix(cov)
  const dist = corr.map((row, i) =>
    row.map((c, j) => (i === j ? 0 : Math.sqrt(0.5 * (1 - Math.min(Math.max(c, -1), 1)))))
  )

  const order   = greedySeriation(dist, n)
  let   weights = Array(n).fill(1.0)
  weights = bisect(order, cov, weights)
  const total = weights.reduce((s, w) => s + w, 0)
  return weights.map(w => w / total)
}

function greedySeriation(dist, n) {
  let bestI = 0, bestJ = 1, bestD = Infinity
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (dist[i][j] < bestD) { bestD = dist[i][j]; bestI = i; bestJ = j }

  const used  = new Set([bestI, bestJ])
  const order = [bestI, bestJ]

  while (used.size < n) {
    const last = order[order.length - 1]
    let nearest = -1, nearD = Infinity
    for (let i = 0; i < n; i++) {
      if (!used.has(i) && dist[last][i] < nearD) { nearD = dist[last][i]; nearest = i }
    }
    order.push(nearest); used.add(nearest)
  }
  return order
}

function bisect(order, cov, weights) {
  if (order.length <= 1) return weights
  const mid   = Math.floor(order.length / 2)
  const left  = order.slice(0, mid)
  const right = order.slice(mid)

  const lVar  = ivpVariance(cov, left)
  const rVar  = ivpVariance(cov, right)
  const total = lVar + rVar
  const alpha = total > 0 ? 1 - lVar / total : 0.5

  const newW = [...weights]
  for (const i of left)  newW[i] = weights[i] * alpha
  for (const i of right) newW[i] = weights[i] * (1 - alpha)

  bisect(left,  cov, newW)
  bisect(right, cov, newW)
  return newW
}

function ivpVariance(cov, indices) {
  const vars      = indices.map(i => cov[i][i])
  const invVarSum = vars.reduce((s, v) => s + (v > 0 ? 1 / v : 0), 0)
  if (invVarSum <= 0) return 0
  const w = vars.map(v => (v > 0 ? 1 / v : 0) / invVarSum)
  let variance = 0
  for (let a = 0; a < indices.length; a++)
    for (let b = 0; b < indices.length; b++)
      variance += w[a] * w[b] * cov[indices[a]][indices[b]]
  return variance
}

/**
 * Minimum CVaR (95%) — Rockafellar & Uryasev (2000)
 * Historical simulation with gradient descent on CVaR.
 */
export function minCVaR(returnMatrix, alpha = 0.05) {
  const n = returnMatrix.length
  const T = returnMatrix[0].length
  let w   = Array(n).fill(1 / n)
  const lr = 0.004

  for (let iter = 0; iter < 3000; iter++) {
    const pfRet = Array.from({ length: T }, (_, t) =>
      returnMatrix.reduce((s, rets, i) => s + w[i] * rets[t], 0)
    )

    const sorted = [...pfRet].sort((a, b) => a - b)
    const k      = Math.max(0, Math.floor(T * alpha) - 1)
    const varThr = sorted[k]

    const tail = pfRet.map((r, t) => ({ r, t })).filter(({ r }) => r <= varThr)
    if (tail.length === 0) break

    const grad = Array(n).fill(0)
    for (const { t } of tail)
      for (let i = 0; i < n; i++)
        grad[i] -= returnMatrix[i][t] / tail.length

    const newW = w.map((wi, i) => Math.max(wi - lr * grad[i], 0))
    const sum  = newW.reduce((s, v) => s + v, 0)
    w = sum > 0 ? newW.map(v => v / sum) : Array(n).fill(1 / n)
  }
  return w
}

/**
 * Equal Weight (1/N) Portfolio  — Naive baseline
 * Equal allocation across all assets. Surprisingly competitive benchmark.
 */
export function equalWeight(n) {
  return Array(n).fill(1 / n)
}

/**
 * Inverse Volatility Portfolio  — Naive, closed-form
 * w_i = (1/σ_i) / Σ(1/σ_j)
 * Assets with lower volatility receive higher weight.
 */
export function inverseVolatility(cov) {
  const n    = cov.length
  const vols = cov.map((row, i) => Math.sqrt(Math.max(row[i], 1e-10)))
  const inv  = vols.map(v => 1 / v)
  const sum  = inv.reduce((a, b) => a + b, 0)
  return sum > 0 ? inv.map(v => v / sum) : Array(n).fill(1 / n)
}

/**
 * Maximum Diversification Ratio  (Choueifaty & Coignard 2008)
 * Maximises DR(w) = w'σ / √(w'Σw) — weighted-average vol divided by portfolio vol.
 * Solved via projected gradient ascent starting from the inverse-vol portfolio.
 */
export function maxDiversification(cov) {
  const n     = cov.length
  const sigma = cov.map((row, i) => Math.sqrt(Math.max(row[i], 1e-10)))

  // Warm-start: inverse volatility weights
  const inv = sigma.map(v => 1 / v)
  const s0  = inv.reduce((a, b) => a + b, 0)
  let w     = inv.map(v => v / s0)

  const lr  = 0.001
  for (let iter = 0; iter < 800; iter++) {
    const Cw    = matVec(cov, w)
    const wCw   = dot(w, Cw)
    const pVol  = Math.sqrt(Math.max(wCw, 1e-12))
    const wSig  = dot(w, sigma)

    // ∂DR/∂w = σ/pVol − (wᵀσ / pVol³) Σw
    const grad = sigma.map((s, i) => s / pVol - (wSig / (pVol * pVol * pVol)) * Cw[i])
    w = projectSimplex(w.map((wi, i) => wi + lr * grad[i]))
  }
  return w
}

/**
 * Hierarchical Equal Risk Contribution (HERC)  (Raffinot 2018)
 * Same Ward-linkage clustering and seriation as HRP, but uses equal risk
 * contribution (inverse-variance) weights at each recursive bisection step
 * rather than IVP at the leaf level only.
 */
export function hierarchicalERC(cov) {
  const n = cov.length
  if (n === 1) return [1]
  if (n === 2) return inverseVolatility(cov)

  const corr = buildCorrMatrix(cov)
  const dist = corr.map((row, i) =>
    row.map((c, j) =>
      i === j ? 0 : Math.sqrt(0.5 * (1 - Math.min(Math.max(c, -1), 1)))
    )
  )

  const order   = greedySeriation(dist, n)
  const weights = Array(n).fill(1.0)
  hERCBisect(order, cov, weights)
  const total = weights.reduce((s, w) => s + w, 0)
  return total > 0 ? weights.map(w => w / total) : Array(n).fill(1 / n)
}

function hERCBisect(order, cov, weights) {
  if (order.length <= 1) return
  const mid   = Math.floor(order.length / 2)
  const left  = order.slice(0, mid)
  const right = order.slice(mid)

  // Equal-risk contribution variance for each cluster
  const lRisk  = ercVariance(cov, left)
  const rRisk  = ercVariance(cov, right)
  const total  = lRisk + rRisk
  const wLeft  = total > 0 ? 1 - lRisk / total : 0.5
  const wRight = 1 - wLeft

  for (const i of left)  weights[i] *= wLeft
  for (const i of right) weights[i] *= wRight

  hERCBisect(left,  cov, weights)
  hERCBisect(right, cov, weights)
}

function ercVariance(cov, indices) {
  // ERC weights within cluster: start from equal, converge toward equal risk
  const m  = indices.length
  let   w  = Array(m).fill(1 / m)
  for (let iter = 0; iter < 200; iter++) {
    const subCov = indices.map(i => indices.map(j => cov[i][j]))
    const sigma  = portfolioVol(w, subCov)
    if (sigma < 1e-12) break
    const Sw     = matVec(subCov, w)
    const rc     = w.map((wi, i) => wi * Sw[i] / sigma)
    const target = sigma * sigma / m
    let   maxD   = 0
    const nw     = w.map((wi, i) => {
      const g   = 2 * Sw[i]
      if (Math.abs(g * wi) < 1e-14) return wi
      const d   = 0.05 * (rc[i] - target) / (g * wi)
      const upd = Math.max(wi - d, 1e-8)
      maxD = Math.max(maxD, Math.abs(upd - wi))
      return upd
    })
    const s = nw.reduce((a, b) => a + b, 0)
    w = nw.map(v => v / s)
    if (maxD < 1e-8) break
  }
  // Portfolio variance with ERC weights
  const subCov = indices.map(i => indices.map(j => cov[i][j]))
  let pVar = 0
  for (let a = 0; a < m; a++)
    for (let b = 0; b < m; b++)
      pVar += w[a] * w[b] * subCov[a][b]
  return Math.max(pVar, 1e-12)
}

// ─── Portfolio statistics ─────────────────────────────────────────────────────

export function portfolioStats(w, mu, cov, rf = RF) {
  const ret    = dot(w, mu)
  const vol    = portfolioVol(w, cov)
  const sharpe = vol > 1e-12 ? (ret - rf) / vol : 0
  return { ret, vol, sharpe }
}

/** Risk contributions: how much each asset contributes to total portfolio risk */
export function riskContributions(w, cov) {
  const sigma = portfolioVol(w, cov)
  if (sigma < 1e-12) return Array(w.length).fill(0)
  const Sw = matVec(cov, w)
  return w.map((wi, i) => wi * Sw[i] / sigma)
}
