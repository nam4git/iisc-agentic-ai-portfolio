import { useChartColors } from '../../hooks/useTheme'

const W = 520, H = 170, ml = 40, mr = 12, mt = 14, mb = 30

export default function ROCEHistory({ history }) {
  const c = useChartColors()
  if (!history?.length) return null

  const pts = [...history].reverse()
  const rocs = pts.map(p => p.roce ?? 0)
  const maxV = Math.max(...rocs, 26)
  const ph = H - mt - mb, pw = W - ml - mr
  const barW = Math.max((pw / pts.length) - 5, 10)
  const xs = i => ml + (pw / pts.length) * i + (pw / pts.length - barW) / 2
  const ys = v => mt + ph - (v / maxV) * ph

  const barColor = r => r === null ? c.border : r >= 20 ? '#166534' : r >= 15 ? '#92400e' : '#991b1b'

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', minWidth: 320 }}>

        {[0, 10, 15, 20, 25].filter(g => g <= maxV + 2).map(g => {
          const y = ys(g)
          const isThreshold = g === 15 || g === 20
          return (
            <g key={g}>
              <line x1={ml} y1={y} x2={W - mr} y2={y}
                stroke={c.border}
                strokeWidth={isThreshold ? 1 : 0.5}
                strokeDasharray={g === 15 ? '4,3' : undefined} />
              <text x={ml - 3} y={y + 3.5} textAnchor="end"
                fill={c.fg3} fontSize="8" fontFamily="JetBrains Mono, monospace">
                {g}%
              </text>
            </g>
          )
        })}

        {pts.map((p, i) => {
          const v = p.roce ?? 0
          const color = barColor(p.roce)
          const barH = (v / maxV) * ph
          const y = ys(v)
          return (
            <g key={i}>
              <rect x={xs(i)} y={y} width={barW} height={barH}
                fill={color} rx="1.5">
                <title>{p.quarter}: {p.roce?.toFixed(1) ?? 'N/A'}%</title>
              </rect>
              {v > 3 && (
                <text x={xs(i) + barW / 2} y={y - 3.5} textAnchor="middle"
                  fill={color} fontSize="7.5" fontFamily="JetBrains Mono, monospace">
                  {p.roce?.toFixed(1) ?? '–'}
                </text>
              )}
              <text x={xs(i) + barW / 2} y={mt + ph + 12} textAnchor="middle"
                fill={c.fg3} fontSize="7.5" fontFamily="JetBrains Mono, monospace">
                {p.quarter}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
