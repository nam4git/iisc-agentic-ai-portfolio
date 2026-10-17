/**
 * GET /api/quote/[ticker]
 * Single live quote — NSE (.NS) with BSE (.BO) fallback.
 * Index tickers (^NSEI etc.) are passed through as-is.
 */

import yahooFinance from 'yahoo-finance2'

export default async function handler(req, res) {
  const { ticker } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker required' })

  const t = ticker.trim().toUpperCase()
  const isIndex = t.startsWith('^')
  const symbol  = isIndex || t.includes('.') ? t : `${t}.NS`

  try {
    const q = await yahooFinance.quote(symbol)
    res.setHeader('Cache-Control', 'no-store')
    return res.json(format(t, q, symbol))
  } catch {
    if (!isIndex && symbol.endsWith('.NS')) {
      try {
        const bso = `${t}.BO`
        const q = await yahooFinance.quote(bso)
        res.setHeader('Cache-Control', 'no-store')
        return res.json(format(t, q, bso))
      } catch {}
    }
    return res.status(404).json({ error: 'not_found', ticker: t })
  }
}

function format(ticker, q, symbol) {
  return {
    ticker, symbol,
    name:        q.shortName || q.longName || symbol,
    price:       q.regularMarketPrice,
    prev_close:  q.regularMarketPreviousClose,
    change:      q.regularMarketChange,
    change_pct:  q.regularMarketChangePercent,
    day_high:    q.regularMarketDayHigh,
    day_low:     q.regularMarketDayLow,
    volume:      q.regularMarketVolume,
    market_cap:  q.marketCap,
    week52_high: q.fiftyTwoWeekHigh,
    week52_low:  q.fiftyTwoWeekLow,
    pe_ratio:    q.trailingPE,
    beta:        q.beta,
    exchange:    q.fullExchangeName || q.exchange,
    currency:    q.currency || 'INR',
    market_state: q.marketState,
  }
}
