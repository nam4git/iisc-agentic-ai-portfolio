export default function MetricBar({ wRet, wBeta, wVol, sharpe }) {
  const retColor = wRet >= 0 ? 'var(--eq-gain)' : 'var(--eq-loss)'
  const shColor  = sharpe >= 1 ? 'var(--eq-gain)' : sharpe >= 0 ? 'var(--eq-fg)' : 'var(--eq-loss)'

  return (
    <div className="grid grid-cols-4 border border-eq-border rounded-lg overflow-hidden bg-eq-card">
      {[
        { label: 'Return YTD',  value: `${wRet >= 0 ? '+' : ''}${wRet.toFixed(1)}%`, color: retColor },
        { label: 'Portfolio β', value: wBeta.toFixed(2),      color: 'var(--eq-fg)' },
        { label: 'Ann. Vol σ',  value: `${wVol.toFixed(1)}%`, color: 'var(--eq-fg)' },
        { label: 'Sharpe',      value: sharpe.toFixed(2),     color: shColor },
      ].map((m, i) => (
        <div key={m.label}
          className={`px-5 py-4 ${i > 0 ? 'border-l border-eq-border' : ''}`}>
          <div className="text-xs text-eq-fg3 mb-2">{m.label}</div>
          <div className="font-mono text-xl font-semibold tabular" style={{ color: m.color }}>
            {m.value}
          </div>
        </div>
      ))}
    </div>
  )
}
