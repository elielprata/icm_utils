import type { Calendar } from '../../lib/calendario'

/** Legenda dos tipos de evento (cor + nome), ordenada como o secretário configurou. */
export function TypeLegend({ types }: { types: Calendar['types'] }) {
  const list = Object.entries(types).sort((a, b) => a[1].order - b[1].order)
  if (list.length === 0) return null

  return (
    <div className="cg-legend">
      {list.map(([id, t]) => (
        <span key={id} className="cg-legend-item">
          <i style={{ background: t.color }} />
          {t.name}
        </span>
      ))}
    </div>
  )
}
