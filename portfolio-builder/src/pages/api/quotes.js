/**
 * GET  /api/quotes?tickers=HDFCBANK,RELIANCE,INFY
 * POST /api/quotes  { tickers: ['HDFCBANK', ...] }
 *
 * Returns live quotes for all requested tickers (NSE .NS, falling back to BSE .BO).
 * Also handles index tickers that already contain ^ or . (pass as-is).
 */

import yahooFinance from 'yahoo-finance2'

export default async function handler(req, res) {
  const rawTickers =
    req.method === 'POST'
      ? req.body?.tickers
      : (req.query.tickers || '').split(',').filter(Boolean)

  if (!rawTickers || rawTickers.length === 0) {
    return res.status(400).json({ error: 'tickers required' })
  }

  const results = await Promise.allSettled(
    rawTickers.map(ticker => fetchQuote(ticker.trim()))
  )

  const quotes = {}
  for (let i = 0; i < rawTickers.length; i++) {
    const key = rawTickers[i].trim().toUpperCase()
    const r = results[i]
    quotes[key] = r.status === 'fulfilled' ? r.value : { ticker: key, error: 'fetch_failed' }
  }

  res.setHeader('Cache-Control', 'no-store')
  res.json(quotes)
}

async function fetchQuote(ticker) {
  const t = ticker.toUpperCase()
  // Index tickers (^NSEI, ^BSESN, etc.) are passed as-is
  const isIndex = t.startsWith('^')
  const symbol  = isIndex || t.includes('.') ? t : `${t}.NS`

  try {
    const q = await yahooFinance.quote(symbol)
    return format(t, q, symbol)
  } catch {
    if (!isIndex && symbol.endsWith('.NS')) {
      try {
        const bso = `${t}.BO`
        const q = await yahooFinance.quote(bso)
        return format(t, q, bso)
      } catch {}
    }
    return { ticker: t, error: 'not_found' }
  }
}

function format(ticker, q, symbol) {
  return {
    ticker,
    symbol,
    name:        q.shortName || q.longName || symbol,
    price:       q.regularMarketPrice,
    prev_close:  q.regularMarketPreviousClose,
    change:      q.regularMarketChange,
    change_pct:  q.regularMarketChangePercent,
    day_high:    q.regularMarketDayHigh,
    day_low:     q.regularMarketDayLow,
    volume:      q.regularMarketVolume,
    market_cap:  q.marketCap,
    exchange:    q.fullExchangeName || q.exchange,
    currency:    q.currency || 'INR',
    market_state: q.marketState,   // REGULAR | PRE | POST | CLOSED
  }
}
