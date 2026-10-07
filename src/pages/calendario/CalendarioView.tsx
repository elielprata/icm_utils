import { useState } from 'react'
import {
  addMonths,
  buildMonthGrid,
  currentMonthKey,
  dateLabel,
  eventsForMonth,
  groupByDate,
  monthLabel,
  publicEvents,
} from '../../lib/calendario'
import { toISO } from '../../lib/schedule'
import { useCalendarData } from './useCalendarData'

const WEEKDAY_LETTERS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
const TODAY_ISO = toISO(new Date())

/** Página pública (sem login): o calendário navegável por mês, só para ver. */
export function CalendarioView({ calendarId }: { calendarId: string }) {
  const { calendar, events: allEvents, error } = useCalendarData(calendarId)
  // Defesa extra: as regras já escondem eventos não confirmados de quem não é secretário.
  const events = publicEvents(allEvents)
  const [month, setMonth] = useState(currentMonthKey())
  const [selected, setSelected] = useState<string | null>(null)

  const minMonth = addMonths(currentMonthKey(), -1)

  if (error) return <p className="status warn app">Não foi possível carregar o calendário: {error}</p>
  if (calendar === undefined) return <p className="hint app">Carregando…</p>
  if (calendar === null) return <p className="status warn app">Calendário não encontrado.</p>

  const cells = buildMonthGrid(month)
  const colorOf = (typeId: string) => calendar.types[typeId]?.color ?? '#999'
  const types = Object.entries(calendar.types).sort((a, b) => a[1].order - b[1].order)
  // Sem dia escolhido, mostra o mês inteiro; escolhendo um dia, filtra só ele.
  const grouped = groupByDate(eventsForMonth(events, month))
  const visibleGroups = selected ? grouped.filter((g) => g.date === selected) : grouped

  return (
    <div className="app calendario cg-public">
      <div className="cg-public-head">
        <div className="cg-public-label">Calendário público</div>
        <h1>{calendar.name || 'Calendário de Eventos'}</h1>
      </div>

      <div className="cg-month-nav">
        <button
          type="button"
          disabled={month <= minMonth}
          onClick={() => {
            setMonth((m) => addMonths(m, -1))
            setSelected(null)
          }}
        >
          ‹
        </button>
        <span>{monthLabel(month)}</span>
        <button
          type="button"
          onClick={() => {
            setMonth((m) => addMonths(m, 1))
            setSelected(null)
          }}
        >
          ›
        </button>
      </div>

      <div className="cg-weekdays">
        {WEEKDAY_LETTERS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="cg-grid cg-grid-interactive">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="cg-cell empty" />
          const isToday = date === TODAY_ISO
          const isPast = date < TODAY_ISO
          const className = ['cg-cell', 'cg-cell-btn', isToday && 'today', isPast && !isToday && 'past', date === selected && 'selected']
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={date}
              type="button"
              className={className}
              aria-label={date}
              onClick={() => setSelected((s) => (s === date ? null : date))}
            >
              <span className="cg-day">{Number(date.slice(8, 10))}</span>
              <div className="cg-dots">
                {events
                  .filter((e) => e.date === date)
                  .map((e) => (
                    <i key={e.id} style={{ background: colorOf(e.typeId) }} />
                  ))}
              </div>
            </button>
          )
        })}
      </div>

      {types.length > 0 && (
        <div className="cg-legend">
          {types.map(([id, t]) => (
            <span key={id} className="cg-legend-item">
              <i style={{ background: t.color }} />
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div className="cg-bydate">
        {selected && visibleGroups.length === 0 && (
          <div className="cg-date-card">
            <div className="cg-date-label">{dateLabel(selected)}</div>
            <p className="hint">Nenhum evento marcado nesse dia.</p>
          </div>
        )}
        {visibleGroups.map((g) => (
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
        {!selected && grouped.length === 0 && <p className="hint">Nenhum evento neste mês ainda.</p>}
      </div>

      <p className="hint cg-public-note">Esta página mostra os eventos conforme os secretários atualizam.</p>
    </div>
  )
}
