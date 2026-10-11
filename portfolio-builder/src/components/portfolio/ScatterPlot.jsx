import { SECTOR_COLOR } from '../../lib/stocks'
import { useChartColors } from '../../hooks/useTheme'

export default function ScatterPlot({ data, pfRet, pfVol }) {
  const c = useChartColors()
  const W = 300, H = 185, ml = 36, mr = 12, mt = 12, mb = 28
  const pw = W - ml - mr, ph = H - mt - mb

  const vols = data.map(d => d.vol ?? 25)
  const rets = data.map(d => d.ret ?? 0)
  const xMin = Math.max(0, Math.min(...vols) - 5)
  const xMax = Math.max(...vols) + 7
  const yMin = Math.min(Math.min(...rets) - 6, -5)
  const yMax = Math.max(...rets) + 8

  const xs = v => ml + (v - xMin) / (xMax - xMin) * pw
  const ys = v => mt + ph - (v - yMin) / (yMax - yMin) * ph

  const ticks = [0, 1, 2, 3, 4]
  const y0 = ys(0)
  const showZero = y0 >= mt && y0 <= mt + ph

  return (
    <div className="px-3 py-2">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', overflow: 'visible' }}>

        {/* grid */}
        {ticks.map(i => {
          const xv = xMin + i * (xMax - xMin) / 4
          const yv = yMin + i * (yMax - yMin) / 4
          return (
            <g key={i}>
              <line x1={xs(xv)} y1={mt} x2={xs(xv)} y2={mt + ph} stroke={c.border} strokeWidth="0.7" />
              <text x={xs(xv)} y={mt + ph + 10} textAnchor="middle"
                fill={c.fg3} fontSize="8" fontFamily="JetBrains Mono, monospace">
                {xv.toFixed(0)}%
              </text>
              <line x1={ml} y1={ys(yv)} x2={ml + pw} y2={ys(yv)} stroke={c.border} strokeWidth="0.7" />
              <text x={ml - 3} y={ys(yv) + 3} textAnchor="end"
                fill={c.fg3} fontSize="8" fontFamily="JetBrains Mono, monospace">
                {yv.toFixed(0)}%
              </text>
            </g>
          )
        })}

        {showZero && (
          <line x1={ml} y1={y0} x2={ml + pw} y2={y0}
            stroke={c.fg3} strokeWidth="0.8" strokeDasharray="3,3" />
        )}

        {/* axis labels */}
        <text x={ml + pw / 2} y={H - 1} textAnchor="middle"
          fill={c.fg3} fontSize="8" fontFamily="JetBrains Mono, monospace">
          Volatility σ
        </text>
        <text x="6" y={mt + ph / 2} textAnchor="middle"
          transform={`rotate(-90,6,${mt + ph / 2})`}
          fill={c.fg3} fontSize="8" fontFamily="JetBrains Mono, monospace">
          Return
        </text>

        {/* dots */}
        {data.map((d, i) => {
          const cx = xs(d.vol ?? 25), cy = ys(d.ret ?? 0)
          const color = SECTOR_COLOR[d.sector] || '#888'
          const r = Math.min(4 + d.alloc * 26, 12)
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity="0.8"
                stroke={c.bg} strokeWidth="1.5">
                <title>{d.ticker} · {(d.ret ?? 0) >= 0 ? '+' : ''}{(d.ret ?? 0).toFixed(1)}% · σ {(d.vol ?? 0).toFixed(1)}%</title>
              </circle>
              <text x={cx + r + 2} y={cy + 3.5} fill={c.fg2}
                fontSize="7.5" fontFamily="JetBrains Mono, monospace">
                {d.ticker}
              </text>
            </g>
          )
        })}

        {/* portfolio dot */}
        <circle cx={xs(pfVol)} cy={ys(pfRet)} r="9"
          fill="none" stroke={c.fg2} strokeWidth="1.5" />
        <circle cx={xs(pfVol)} cy={ys(pfRet)} r="2.5" fill={c.fg2} />
        <text x={xs(pfVol)} y={ys(pfRet) - 13} textAnchor="middle"
          fill={c.fg2} fontSize="8" fontFamily="JetBrains Mono, monospace" fontWeight="600">
          PF
        </text>
      </svg>
    </div>
  )
}
