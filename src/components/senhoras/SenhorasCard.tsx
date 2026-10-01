import { useState, type CSSProperties } from 'react'
import type { Overrides } from '../../types'
import { formatDay, MONTHS, periodLabel, toISO } from '../../lib/schedule'
import { ROLES, type Role, type SenhorasMonth } from '../../lib/senhoras'
import bannerUrl from '../../assets/senhoras-banner.webp'

interface Props {
  blocks: SenhorasMonth[]
  table: number[][]
  people: string[]
  /** Semana do rodízio (0-based) em cada data */
  roundOf: (date: Date) => number
  /** Mostrar o número do rodízio em cada data */
  showRounds: boolean
  overrides: Overrides
  onOverride?: (key: string, name: string | null) => void
  /** Versão usada para gerar a imagem: largura fixa e sem edição. */
  exporting?: boolean
}

export const senhorasKey = (date: Date, role: Role) => `${toISO(date)}|${role}`

export function SenhorasCard({ blocks, table, people, roundOf, showRounds, overrides, onOverride, exporting }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  return (
    <div className={`senhoras-sheet${exporting ? ' export' : ''}`}>
      <img className="ss-banner" src={bannerUrl} alt="Trabalho de Senhoras" />
      <div className="ss-period">{periodLabel(blocks)}</div>

      {blocks.map((block) => {
        const rounds = block.dates.map(roundOf)
        return (
          <div key={`${block.year}-${block.month}`} className="ss-month">
            <div className="ss-month-name">{MONTHS[block.month]}</div>
            <div className="ss-table" style={{ '--dates': block.dates.length + block.skipped.length } as CSSProperties}>
              <div />
              {block.dates.map((date, di) => {
                const restart = showRounds && rounds[di] === 0
                return (
                  <div key={date.getDate()} className={`ss-date${restart ? ' restart' : ''}`}>
                    {formatDay(date)}
                    {showRounds && <span className="ss-round">{restart ? '↻ 1º' : `${rounds[di] + 1}º`}</span>}
                  </div>
                )
              })}
              {block.skipped.map((date) => (
                <div key={date.getDate()} className="ss-date skipped">
                  {formatDay(date)}
                </div>
              ))}

              {ROLES.map((role, r) => [
                <div key={role} className="ss-role">
                  {role}
                </div>,
                ...block.dates.map((date, di) => {
                  const key = senhorasKey(date, role)
                  const name = overrides[key] ?? people[table[r][rounds[di]] - 1]
                  if (exporting) {
                    return (
                      <div key={key} className="ss-cell">
                        {name}
                      </div>
                    )
                  }
                  return (
                    <div key={key} className="ss-cell">
                      {editing === key ? (
                        <select
                          autoFocus
                          value={overrides[key] ?? ''}
                          onBlur={() => setEditing(null)}
                          onChange={(e) => {
                            onOverride?.(key, e.target.value || null)
                            setEditing(null)
                          }}
                        >
                          <option value="">(pela tabela)</option>
                          {people.map((p, i) => (
                            <option key={`${p}-${i}`} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button type="button" title="Clique para trocar" onClick={() => setEditing(key)}>
                          {name}
                          {overrides[key] && <span className="manual-dot" />}
                        </button>
                      )}
                    </div>
                  )
                }),
                // 5ª quarta-feira: uma célula ocupando as três funções
                ...(r === 0
                  ? block.skipped.map((date) => (
                      <div key={toISO(date)} className="ss-skip">
                        <span>5ª quarta</span>
                        Sem escala
                      </div>
                    ))
                  : []),
              ])}
            </div>
          </div>
        )
      })}
    </div>
  )
}
