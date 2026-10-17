/**
 * GET /api/history/[symbol]?period=1y&interval=1d
 * Returns daily close price history. Used by optimization and insurance pages.
 * symbol: ticker (RELIANCE → RELIANCE.NS) or index (^NSEI)
 */

import yahooFinance from 'yahoo-finance2'

export default async function handler(req, res) {
  const { symbol, period = '1y', interval = '1d' } = req.query
  if (!symbol) return res.status(400).json({ error: 'symbol required' })

  const t = symbol.trim().toUpperCase()
  const isIndex = t.startsWith('^')
  const ySymbol = isIndex || t.includes('.') ? t : `${t}.NS`

  const end   = new Date()
  const start = new Date()
  if (period === '3y') start.setFullYear(start.getFullYear() - 3)
  else if (period === '2y') start.setFullYear(start.getFullYear() - 2)
  else start.setFullYear(start.getFullYear() - 1)

  try {
    const data = await yahooFinance.historical(ySymbol, {
      period1: start, period2: end, interval,
    })

    const prices = data
      .filter(d => (d.adjClose || d.close) > 0)
      .map(d => ({
        date:  d.date.toISOString().split('T')[0],
        close: d.adjClose || d.close,
        open:  d.open,
        high:  d.high,
        low:   d.low,
        volume: d.volume,
      }))

    res.setHeader('Cache-Control', 'public, max-age=3600')
    return res.json({ symbol: ySymbol, prices })
  } catch {
    if (!isIndex && ySymbol.endsWith('.NS')) {
      try {
        const bso = t + '.BO'
        const data = await yahooFinance.historical(bso, {
          period1: start, period2: end, interval,
        })
        const prices = data
          .filter(d => (d.adjClose || d.close) > 0)
          .map(d => ({ date: d.date.toISOString().split('T')[0], close: d.adjClose || d.close }))
        res.setHeader('Cache-Control', 'public, max-age=3600')
        return res.json({ symbol: bso, prices })
      } catch {}
    }
    return res.status(404).json({ error: 'not_found', symbol: ySymbol })
  }
}
