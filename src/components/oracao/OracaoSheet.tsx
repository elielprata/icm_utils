import { Fragment } from 'react'
import { bySlot, formatRange, slotLabel, SLOTS, type Entry, type Period } from '../../lib/oracao'

interface Props {
  period: Period
  entries: Entry[]
  /** Versão usada para gerar a imagem: largura fixa. */
  exporting?: boolean
}

/** Lista completa (00:00 às 24:00) no formato da planilha, com os nomes na cor de cada igreja. */
export function OracaoSheet({ period, entries, exporting }: Props) {
  const slots = bySlot(entries)
  const churches = Object.entries(period.churches).sort((a, b) => a[1].order - b[1].order)
  const filled = slots.filter((s) => s.length > 0).length

  const column = (from: number, title: string) => (
    <div>
      <div className="os-col-title">{title}</div>
      <div className="os-rows">
        {slots.slice(from, from + SLOTS / 2).map((people, i) => (
          <div key={from + i} className={`os-row${people.length ? '' : ' empty'}`}>
            <span className="os-time">{slotLabel(from + i)}</span>
            <span className="os-names">
              {people.map((e, k) => (
                <Fragment key={e.id}>
                  {k > 0 && <span className="os-sep"> / </span>}
                  <span style={{ color: period.churches[e.church]?.color }}>{e.name}</span>
                </Fragment>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className={`oracao-sheet${exporting ? ' export' : ''}`}>
      <div className="os-head">
        {period.motivo && <div className="os-kicker">{period.motivo}</div>}
        <h3>Oração Ininterrupta</h3>
        <div className="os-period">{formatRange(period)}</div>
      </div>
      <div className="os-legend">
        {churches.map(([code, c]) => (
          <span key={code}>
            <i style={{ background: c.color }} />
            {c.name}
          </span>
        ))}
      </div>
      <div className="os-cols">
        {column(0, 'MADRUGADA E MANHÃ')}
        {column(SLOTS / 2, 'TARDE E NOITE')}
      </div>
      <div className="os-foot">
        <span>
          <b>{filled}</b> de {SLOTS} horários preenchidos
        </span>
        <span>
          <b>{SLOTS - filled}</b> vagos
        </span>
        <span>
          <b>{entries.length}</b> pessoas
        </span>
      </div>
    </div>
  )
}
