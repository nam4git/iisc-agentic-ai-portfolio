import { useChartColors } from '../../hooks/useTheme'

const SIZE = 112, R = 48, IR = 30

function arc(cx, cy, r, startDeg, endDeg) {
  const toRad = d => (d - 90) * Math.PI / 180
  const x1 = cx + r * Math.cos(toRad(startDeg))
  const y1 = cy + r * Math.sin(toRad(startDeg))
  const x2 = cx + r * Math.cos(toRad(endDeg))
  const y2 = cy + r * Math.sin(toRad(endDeg))
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

export default function SectorDonut({ sectors }) {
  const c = useChartColors()
  if (!sectors?.length) return null

  let offset = 0
  const slices = sectors.map(s => {
    const start = offset
    const sweep = s.pct * 3.6
    offset += sweep
    return { ...s, start, end: offset }
  })

  return (
    <div className="px-4 py-3 flex items-center gap-5">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path key={i}
            d={arc(SIZE / 2, SIZE / 2, R, s.start, s.end - 0.3)}
            fill="none"
            stroke={s.color}
            strokeWidth={R - IR}
            strokeLinecap="butt">
            <title>{s.name}: {s.pct.toFixed(1)}%</title>
          </path>
        ))}
        <circle cx={SIZE / 2} cy={SIZE / 2} r={IR} fill={c.bg} />
      </svg>

      <div className="space-y-1 min-w-0 flex-1">
        {sectors.slice(0, 6).map(s => (
          <div key={s.name} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span className="text-eq-fg2 truncate flex-1">{s.name}</span>
            <span className="font-mono text-eq-fg tabular flex-shrink-0">{s.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
