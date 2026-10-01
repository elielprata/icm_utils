import { forwardRef, useState, type CSSProperties } from 'react'
import type { ClassGroup, Overrides } from '../types'
import { formatDay, MONTHS, overrideKey, personFor, type MonthBlock } from '../lib/schedule'
import bannerUrl from '../assets/fundo-area-kids-site.webp'
import logoUrl from '../assets/logo-cias.webp'

interface Props {
  group: ClassGroup
  blocks: MonthBlock[]
  overrides: Overrides
  onOverride?: (key: string, name: string | null) => void
  /** Versão usada para gerar a imagem: largura fixa e sem edição. */
  exporting?: boolean
}

function periodLabel(blocks: MonthBlock[]) {
  const first = blocks[0]
  const last = blocks[blocks.length - 1]
  if (first === last) return `${MONTHS[first.month]} ${first.year}`
  if (first.year === last.year) return `${MONTHS[first.month]} a ${MONTHS[last.month]} ${last.year}`
  return `${MONTHS[first.month]} ${first.year} a ${MONTHS[last.month]} ${last.year}`
}

export const ClassCard = forwardRef<HTMLDivElement, Props>(function ClassCard(
  { group, blocks, overrides, onOverride, exporting },
  ref,
) {
  const [editing, setEditing] = useState<string | null>(null)
  let index = 0

  return (
    <div className={`class-sheet${exporting ? ' export' : ''}`} ref={ref} style={{ '--accent': group.color } as CSSProperties}>
      <div className="cs-banner">
        <img className="cs-banner-bg" src={bannerUrl} alt="" />
        <img className="cs-logo" src={logoUrl} alt="CIAS" />
      </div>

      <div className="cs-head">
        <div className="cs-class">
          {group.emoji} {group.name}
        </div>
        <div className="cs-period">{periodLabel(blocks)}</div>
      </div>

      <div className="cs-months" style={{ '--cols': blocks.length } as CSSProperties}>
        {blocks.map((block) => (
          <div key={`${block.year}-${block.month}`} className="cs-month">
            <div className="cs-month-name">{MONTHS[block.month]}</div>
            {block.dates.map((date) => {
              const key = overrideKey(date, group.id)
              const name = personFor(group, date, index++, overrides)
              return (
                <div key={key} className="cs-row">
                  <span className="cs-date">{formatDay(date)}</span>
                  {exporting ? (
                    <span className="cs-name">{name || '—'}</span>
                  ) : editing === key ? (
                    <select
                      autoFocus
                      value={overrides[key] ?? ''}
                      onBlur={() => setEditing(null)}
                      onChange={(e) => {
                        onOverride?.(key, e.target.value || null)
                        setEditing(null)
                      }}
                    >
                      <option value="">(automático)</option>
                      {group.people.map((p, i) => (
                        <option key={`${p}-${i}`} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      type="button"
                      className="cs-name"
                      title="Clique para trocar a pessoa desta data"
                      onClick={() => setEditing(key)}
                    >
                      {name || '—'}
                      {overrides[key] && <span className="manual-dot" />}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
})
