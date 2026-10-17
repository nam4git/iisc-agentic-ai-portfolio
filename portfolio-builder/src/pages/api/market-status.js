/**
 * GET /api/market-status
 * Returns NSE/BSE market open/closed status based on IST time.
 * Note: Exchange holidays are NOT checked — only weekday + standard hours.
 *
 * NSE/BSE hours:
 *   Pre-open session : 09:00–09:15 IST
 *   Regular trading  : 09:15–15:30 IST
 *   Post-close       : 15:40–16:00 IST
 */

export default function handler(req, res) {
  const now = new Date()
  // Compute IST time
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const day = ist.getDay()        // 0=Sun, 6=Sat
  const h   = ist.getHours()
  const m   = ist.getMinutes()
  const min = h * 60 + m

  const isWeekday   = day >= 1 && day <= 5
  const isPreOpen   = isWeekday && min >= 9 * 60       && min < 9 * 60 + 15
  const isRegular   = isWeekday && min >= 9 * 60 + 15  && min < 15 * 60 + 30
  const isPostClose = isWeekday && min >= 15 * 60 + 40 && min < 16 * 60

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  res.setHeader('Cache-Control', 'no-store')
  res.json({
    open:        isRegular,
    pre_open:    isPreOpen,
    post_close:  isPostClose,
    weekend:     !isWeekday,
    closed:      !isWeekday || (!isPreOpen && !isRegular && !isPostClose),
    session:     isPreOpen ? 'PRE_OPEN' : isRegular ? 'REGULAR' : isPostClose ? 'POST_CLOSE' : 'CLOSED',
    time_ist:    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    day:         DAYS[day],
    note:        'Exchange holidays not verified. Standard NSE/BSE weekday hours only.',
  })
}
