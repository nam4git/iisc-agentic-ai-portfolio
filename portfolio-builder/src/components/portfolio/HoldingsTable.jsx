import { SECTOR_COLOR } from '../../lib/stocks'
import { totalWeight } from '../../lib/portfolio'

export default function HoldingsTable({ data, portfolio, onUpdateWeight, onRemove }) {
  const total = portfolio.reduce((s, h) => s + h.weight, 0)
  const normalised = Math.abs(total - 100) < 0.01

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full border-collapse" style={{ minWidth: 540 }}>
        <thead>
          <tr className="bg-eq-bg2 border-b border-eq-border">
            {['Stock', 'Sector', 'Weight', 'Price', 'Return', 'Beta', 'Vol σ', ''].map((h, i) => (
              <th key={h}
                className={`px-4 py-2.5 text-xs font-medium text-eq-fg3 whitespace-nowrap ${i > 1 && i < 7 ? 'text-right' : 'text-left'} last:text-center`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => {
            const sc = SECTOR_COLOR[d.sector] || '#888'
            const ret = d.ret ?? 0
            return (
              <tr key={d.ticker} className="tr-fin">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sc }} />
                    <span className="font-mono text-sm font-medium">{d.ticker}</span>
                    {d.fno && (
                      <span className="text-[10px] text-eq-fg3 border border-eq-border rounded px-1">F&O</span>
                    )}
                  </div>
                  <div className="text-xs text-eq-fg3 pl-3.5 mt-0.5">{d.name}</div>
                </td>
                <td className="px-4 py-2.5 text-xs" style={{ color: sc }}>{d.sector}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-8 h-px bg-eq-border rounded-full overflow-hidden flex-shrink-0 relative" style={{ height: 2 }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(d.weight * 3.5, 100)}%`, background: 'var(--eq-acc)' }} />
                    </div>
                    <input type="number" defaultValue={d.weight} min="1"
                      onBlur={e => onUpdateWeight(i, parseFloat(e.target.value))}
                      className="w-12 bg-transparent border border-transparent focus:border-eq-border rounded px-1.5 py-0.5 text-right font-mono text-xs focus:outline-none focus:bg-eq-el transition-colors"
                    />
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-eq-fg2">
                  ₹{(d.price ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs"
                  style={{ color: ret >= 0 ? 'var(--eq-gain)' : 'var(--eq-loss)' }}>
                  {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-eq-fg2">
                  {(d.beta ?? 1).toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-eq-fg2">
                  {(d.vol ?? 0).toFixed(1)}%
                </td>
                <td className="px-4 py-2.5 text-center">
                  <button onClick={() => onRemove(i)}
                    className="text-eq-fg3 hover:text-eq-loss text-lg leading-none transition-colors">
                    ×
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-eq-border bg-eq-bg2">
            <td colSpan={2} className="px-4 py-2 text-xs text-eq-fg3">
              {portfolio.length} positions
            </td>
            <td colSpan={6} className="px-4 py-2 text-right font-mono text-xs"
              style={{ color: normalised ? 'var(--eq-gain)' : 'var(--eq-warn)' }}>
              {total.toFixed(1)}%{!normalised && ' — not normalised'}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
