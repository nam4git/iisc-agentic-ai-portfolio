/**
 * Yahoo Finance historical data fetcher.
 * Uses query2.finance.yahoo.com v8 chart API with browser headers — works from
 * Vercel serverless where yahoo-finance2's cookie/crumb flow is blocked.
 */

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/',
  'Origin': 'https://finance.yahoo.com',
}

/**
 * Fetch daily close history. Returns [{date: 'YYYY-MM-DD', close: number}].
 * Tries NSE (.NS) first, then BSE (.BO).
 */
export async function fetchHistory(ticker, startDate, endDate) {
  const t = ticker.trim().toUpperCase()
  const symbol = t.startsWith('^') || t.includes('.') ? t : `${t}.NS`

  try {
    return await _chartFetch(symbol, startDate, endDate)
  } catch {
    if (!t.startsWith('^') && !t.includes('.')) {
      return await _chartFetch(`${t}.BO`, startDate, endDate)
    }
    throw new Error(`No data for ${symbol}`)
  }
}

async function _chartFetch(symbol, start, end) {
  const p1 = Math.floor(start.getTime() / 1000)
  const p2 = Math.floor(end.getTime() / 1000)
  const url =
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?period1=${p1}&period2=${p2}&interval=1d&events=history&includeAdjustedClose=true`

  const resp = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(9000),
  })

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

  const json = await resp.json()
  const result = json.chart?.result?.[0]
  if (!result?.timestamp?.length) throw new Error('empty')

  const ts       = result.timestamp
  const closes   = result.indicators?.quote?.[0]?.close ?? []
  const adjClose = result.indicators?.adjclose?.[0]?.adjclose ?? []

  return ts
    .map((t, i) => ({
      date:  new Date(t * 1000).toISOString().split('T')[0],
      close: adjClose[i] || closes[i] || null,
    }))
    .filter(d => d.close && d.close > 0)
}
