import type { CSSProperties } from 'react'
import { buildMonthGrid, dateLabel, eventsForMonth, groupByDate, monthLabel, nextMonthKey, publicEvents, type Calendar, type CalendarEvent } from '../../lib/calendario'
import { TypeLegend } from './TypeLegend'

const WEEKDAY_LETTERS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

interface Props {
  calendarName: string
  startMonth: string
  monthCount: 1 | 2
  events: CalendarEvent[]
  types: Calendar['types']
  /** Versão usada para gerar a imagem: largura fixa. */
  exporting?: boolean
}

/** Cartão exportável: título, grade de 1 ou 2 meses com bolinhas por dia, legenda e lista por data. */
export function MonthGridCard({ calendarName, startMonth, monthCount, events, types, exporting }: Props) {
  // Eventos ainda não confirmados não entram na imagem: só quem administra os vê.
  const shown = publicEvents(events)
  const monthKeys = monthCount === 2 ? [startMonth, nextMonthKey(startMonth)] : [startMonth]
  const colorOf = (typeId: string) => types[typeId]?.color ?? '#999'

  return (
    <div className={`cg-sheet${exporting ? ' export' : ''}`}>
      <div className="cg-head">
        <div className="cg-head-title">Programação</div>
        {calendarName && <div className="cg-head-sub">{calendarName}</div>}
      </div>

      <TypeLegend types={types} />

      <div className="cg-months" style={{ '--cg-cols': monthKeys.length } as CSSProperties}>
        {monthKeys.map((key) => {
          const cells = buildMonthGrid(key)
          const monthEvents = eventsForMonth(shown, key)
          const byDate = groupByDate(monthEvents)

          return (
            <div key={key} className="cg-month">
              <div className="cg-month-label">{monthLabel(key)}</div>

              <div className="cg-weekdays">
                {WEEKDAY_LETTERS.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
              <div className="cg-grid">
                {cells.map((date, i) =>
                  date ? (
                    <div key={date} className="cg-cell">
                      <span className="cg-day">{Number(date.slice(8, 10))}</span>
                      <div className="cg-dots">
                        {monthEvents
                          .filter((e) => e.date === date)
                          .map((e) => (
                            <i key={e.id} style={{ background: colorOf(e.typeId) }} />
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div key={`empty-${i}`} className="cg-cell empty" />
                  ),
                )}
              </div>

              <div className="cg-bydate">
                {byDate.map((g) => (
                  <div key={g.date} className="cg-date-card">
                    <div className="cg-date-label">{dateLabel(g.date)}</div>
                    {g.events.map((e) => (
                      <div key={e.id} className="cg-event-row">
                        <i style={{ background: colorOf(e.typeId) }} />
                        <span>
                          {e.time && <b>{e.time} · </b>}
                          {e.title}
                          {e.note && <span className="cg-note"> · {e.note}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
