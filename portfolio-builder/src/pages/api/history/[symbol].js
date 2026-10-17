/**
 * GET /api/history/[symbol]?period=1y&interval=1d
 * Returns daily close price history. Used by optimization and insurance pages.
 * symbol: ticker (RELIANCE → RELIANCE.NS) or index (^NSEI)
 */

import { fetchHistory } from '../../../lib/yahoo'

export default async function handler(req, res) {
  const { symbol, period = '1y' } = req.query
  if (!symbol) return res.status(400).json({ error: 'symbol required' })

  const end   = new Date()
  const start = new Date()
  if (period === '3y') start.setFullYear(start.getFullYear() - 3)
  else if (period === '2y') start.setFullYear(start.getFullYear() - 2)
  else start.setFullYear(start.getFullYear() - 1)

  try {
    const prices = await fetchHistory(symbol, start, end)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    return res.json({ symbol: symbol.toUpperCase(), prices })
  } catch {
    return res.status(404).json({ error: 'not_found', symbol })
  }
}
