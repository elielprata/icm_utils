import { useState, type CSSProperties } from 'react'
import type { User } from 'firebase/auth'
import { PageHeader } from '../../components/PageHeader'
import { PageTabs } from '../../components/PageTabs'
import { Sheet } from '../../components/Sheet'
import { Shareable } from '../../components/Shareable'
import { MonthGridCard } from '../../components/calendario/MonthGridCard'
import {
  addEvent,
  buildMonthGrid,
  currentMonthKey,
  dateLabel,
  removeEvent,
  TYPE_COLORS,
  updateCalendar,
  updateEvent,
  viewLink,
  type Calendar,
  type CalendarEvent,
} from '../../lib/calendario'
import { SecretarioGate } from './SecretarioGate'
import { useCalendarData } from './useCalendarData'

type Tab = 'eventos' | 'tipos' | 'secretarios' | 'compartilhar'

export function CalendarioAdmin({ calendarId }: { calendarId: string }) {
  return (
    <div className="app calendario">
      <PageHeader title="📅 Calendário de Eventos" back="#/calendario" backLabel="Meus calendários" />
      <SecretarioGate>{(user) => <Admin calendarId={calendarId} user={user} />}</SecretarioGate>
    </div>
  )
}

function Admin({ calendarId, user }: { calendarId: string; user: User }) {
  const { calendar, events, error } = useCalendarData(calendarId)
  const [tab, setTab] = useState<Tab>('eventos')
  const me = user.email!.toLowerCase()

  if (error) return <p className="status warn">Não foi possível carregar o calendário: {error}</p>
  if (calendar === undefined) return <p className="hint">Carregando…</p>
  if (calendar === null) return <p className="status warn">Calendário não encontrado.</p>
  if (!calendar.admins.includes(me)) {
    return <p className="status warn">Você não é secretário deste calendário. Peça para um secretário incluir {user.email}.</p>
  }

  return (
    <>
      <div className="cg-title-row">
        <strong>{calendar.name || 'Calendário de Eventos'}</strong>
      </div>
      <PageTabs
        tabs={[
          { id: 'eventos', label: 'Eventos' },
          { id: 'tipos', label: 'Tipos' },
          { id: 'secretarios', label: 'Secretários' },
          { id: 'compartilhar', label: 'Compartilhar' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'eventos' && <EventsTab calendar={calendar} events={events} />}
      {tab === 'tipos' && <TypesTab calendar={calendar} events={events} />}
      {tab === 'secretarios' && <SecretariesTab calendar={calendar} me={me} />}
      {tab === 'compartilhar' && <ShareTab calendar={calendar} events={events} calendarId={calendarId} />}
    </>
  )
}

const WEEKDAY_LETTERS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

type Draft = { time: string; title: string; note: string; typeId: string; confirmed: boolean }
const emptyDraft = (typeId: string): Draft => ({ time: '', title: '', note: '', typeId, confirmed: true })

function EventsTab({ calendar, events }: { calendar: Calendar; events: CalendarEvent[] }) {
  const [month, setMonth] = useState(currentMonthKey())
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const typeIds = Object.entries(calendar.types)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([id]) => id)
  const [draft, setDraft] = useState<Draft>(emptyDraft(typeIds[0] ?? ''))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cells = buildMonthGrid(month)
  const colorOf = (typeId: string) => calendar.types[typeId]?.color ?? '#999'

  const close = () => {
    setSelected(null)
    setEditing(null)
    setError(null)
  }

  const open = (date: string) => {
    setSelected(date)
    setEditing(null)
    setDraft(emptyDraft(typeIds[0] ?? ''))
  }

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setBusy(false)
    }
  }

  const dayEvents = selected ? events.filter((e) => e.date === selected) : []

  return (
    <section className="panel">
      <label className="field cg-month-field">
        <span>Mês</span>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </label>

      {typeIds.length === 0 && (
        <p className="status warn">Cadastre pelo menos um tipo de evento na aba Tipos antes de adicionar eventos.</p>
      )}

      <div className="cg-weekdays">
        {WEEKDAY_LETTERS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="cg-grid cg-grid-interactive">
        {cells.map((date, i) =>
          date ? (
            <button key={date} type="button" className="cg-cell cg-cell-btn" aria-label={date} onClick={() => open(date)}>
              <span className="cg-day">{Number(date.slice(8, 10))}</span>
              <div className="cg-dots">
                {events
                  .filter((e) => e.date === date)
                  .map((e) =>
                    e.confirmed === false ? (
                      <i key={e.id} className="pending" style={{ background: colorOf(e.typeId) }} />
                    ) : (
                      <i key={e.id} style={{ background: colorOf(e.typeId) }} />
                    ),
                  )}
              </div>
            </button>
          ) : (
            <div key={`empty-${i}`} className="cg-cell empty" />
          ),
        )}
      </div>
      <p className="hint">
        Toque num dia para ver ou adicionar eventos. <i className="pending" style={{ background: '#999' }} /> = ainda
        não confirmado (só você vê; não entra no link nem na imagem).
      </p>

      {selected && typeIds.length > 0 && (
        <Sheet title={dateLabel(selected)} onClose={close}>
          {error && <p className="status warn">{error}</p>}
          <div className="cg-sheet-events">
            {dayEvents.map((e) => (
              <div key={e.id} className="cg-sheet-event-row" style={{ '--cg-item-accent': colorOf(e.typeId) } as CSSProperties}>
                <span>
                  {e.time && <b>{e.time} · </b>}
                  {e.title}
                  {e.note && <span className="cg-note"> · {e.note}</span>}
                  {e.confirmed === false && <span className="cg-note"> · não confirmado</span>}
                </span>
                <span className="pl-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setEditing(e)
                      setDraft({ time: e.time ?? '', title: e.title, note: e.note ?? '', typeId: e.typeId, confirmed: e.confirmed !== false })
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="ghost danger"
                    disabled={busy}
                    onClick={() => confirm(`Remover "${e.title}"?`) && run(() => removeEvent(calendar.id, e.id))}
                  >
                    Remover
                  </button>
                </span>
              </div>
            ))}
            {dayEvents.length === 0 && <p className="hint">Nenhum evento nesse dia ainda.</p>}
          </div>

          <form
            className="sheet-form"
            onSubmit={async (ev) => {
              ev.preventDefault()
              if (!draft.title.trim() || !draft.typeId) return
              const data = {
                date: selected,
                title: draft.title.trim().slice(0, 80),
                typeId: draft.typeId,
                confirmed: draft.confirmed,
                ...(draft.time ? { time: draft.time } : {}),
                ...(draft.note.trim() ? { note: draft.note.trim().slice(0, 80) } : {}),
              }
              const ok = editing
                ? await run(() => updateEvent(calendar.id, editing.id, data))
                : await run(() => addEvent(calendar.id, data))
              if (ok) {
                setEditing(null)
                setDraft(emptyDraft(typeIds[0] ?? ''))
              }
            }}
          >
            <b>{editing ? `Editar ${editing.title}` : 'Novo evento'}</b>
            <input
              aria-label="Hora (opcional)"
              type="time"
              value={draft.time}
              onChange={(e) => setDraft({ ...draft, time: e.target.value })}
            />
            <input
              aria-label="Título"
              placeholder="Título do evento"
              value={draft.title}
              maxLength={80}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <input
              aria-label="Nota (opcional)"
              placeholder="Nota (opcional, ex.: local)"
              value={draft.note}
              maxLength={80}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
            <select aria-label="Tipo" value={draft.typeId} onChange={(e) => setDraft({ ...draft, typeId: e.target.value })}>
              {typeIds.map((id) => (
                <option key={id} value={id}>
                  {calendar.types[id].name}
                </option>
              ))}
            </select>
            <label className="check">
              <input
                type="checkbox"
                checked={draft.confirmed}
                onChange={(e) => setDraft({ ...draft, confirmed: e.target.checked })}
              />
              Confirmado (desmarque se a data ou o horário ainda podem mudar)
            </label>
            <div className="sheet-buttons">
              {editing && (
                <button type="button" className="ghost" onClick={() => { setEditing(null); setDraft(emptyDraft(typeIds[0] ?? '')) }}>
                  Cancelar edição
                </button>
              )}
              <button className="primary" disabled={busy || !draft.title.trim()}>
                {editing ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </form>
        </Sheet>
      )}
    </section>
  )
}

function TypesTab({ calendar, events }: { calendar: Calendar; events: CalendarEvent[] }) {
  const [error, setError] = useState<string | null>(null)
  const types = Object.entries(calendar.types).sort((a, b) => a[1].order - b[1].order)
  const countOf = (id: string) => events.filter((e) => e.typeId === id).length

  const save = (next: Calendar['types']) =>
    updateCalendar(calendar.id, { types: next }).catch((e: Error) => setError(e.message))

  const setType = (id: string, patch: Partial<Calendar['types'][string]>) =>
    save({ ...calendar.types, [id]: { ...calendar.types[id], ...patch } })

  const addType = () => {
    const code = Math.random().toString(36).slice(2, 8)
    const used = new Set(Object.values(calendar.types).map((t) => t.color))
    const color = TYPE_COLORS.find((c) => !used.has(c)) ?? TYPE_COLORS[0]
    const order = Math.max(-1, ...Object.values(calendar.types).map((t) => t.order)) + 1
    save({ ...calendar.types, [code]: { name: '', color, order } })
  }

  const removeType = (id: string) => {
    const next = { ...calendar.types }
    delete next[id]
    save(next)
  }

  return (
    <section className="panel">
      <h2>Tipos de evento</h2>
      <p className="hint">A cor e o nome que aparecem na grade, na legenda e no formulário de cada evento.</p>
      <div className="church-edit">
        {types.map(([id, t]) => (
          <div key={id} className="church-edit-row">
            <input type="color" aria-label="Cor do tipo" value={t.color} onChange={(e) => setType(id, { color: e.target.value })} />
            <input
              className="church-name"
              aria-label="Nome do tipo"
              placeholder="Nome do tipo"
              value={t.name}
              maxLength={40}
              onChange={(e) => setType(id, { name: e.target.value })}
            />
            <div className="swatches">
              {TYPE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={color === t.color ? 'on' : ''}
                  style={{ background: color }}
                  aria-label={`Usar a cor ${color}`}
                  onClick={() => setType(id, { color })}
                />
              ))}
            </div>
            {countOf(id) ? (
              <span className="church-count">{countOf(id)} evento{countOf(id) === 1 ? '' : 's'}</span>
            ) : (
              <button type="button" className="remove" onClick={() => removeType(id)} aria-label="Remover tipo">
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" className="add-church" onClick={addType}>
          + Adicionar tipo
        </button>
      </div>
      {error && <p className="status warn">{error}</p>}
    </section>
  )
}

function SecretariesTab({ calendar, me }: { calendar: Calendar; me: string }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const save = (admins: string[]) => updateCalendar(calendar.id, { admins }).catch((e: Error) => setError(e.message))

  return (
    <section className="panel">
      <h2>Secretários</h2>
      <p className="hint">Quem estiver nesta lista entra com a conta Google e pode editar este calendário.</p>
      <ul className="admins">
        {calendar.admins.map((a) => (
          <li key={a}>
            {a}
            {a === me ? (
              <span className="hint"> (você)</span>
            ) : (
              <button className="link" onClick={() => save(calendar.admins.filter((x) => x !== a))}>
                remover
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault()
          const value = email.trim().toLowerCase()
          if (!value.includes('@') || calendar.admins.includes(value)) return
          save([...calendar.admins, value])
          setEmail('')
        }}
      >
        <input type="email" placeholder="email@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit">Adicionar</button>
      </form>
      {error && <p className="status warn">{error}</p>}
    </section>
  )
}

function ShareTab({ calendar, events, calendarId }: { calendar: Calendar; events: CalendarEvent[]; calendarId: string }) {
  const [startMonth, setStartMonth] = useState(currentMonthKey())
  const [monthCount, setMonthCount] = useState<1 | 2>(2)
  const [copied, setCopied] = useState(false)
  const hasTypes = Object.keys(calendar.types).length > 0
  const link = viewLink(calendarId)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      prompt('Copie o link:', link)
    }
  }

  return (
    <>
      <section className="panel">
        <h2>Link público</h2>
        <p className="hint">
          Quem abrir esse link vê o calendário navegando pelos meses, sem precisar de login e sem poder editar.
          Eventos ainda não confirmados não aparecem nele. Envie para o grupo da igreja.
        </p>
        <div className="link-row">
          <span className="cg-link-text">{link}</span>
          <button className="primary" onClick={copy}>
            {copied ? '✓ Copiado' : 'Copiar link'}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="cg-share-controls">
          <label className="field">
            <span>Mês inicial</span>
            <input type="month" value={startMonth} onChange={(e) => e.target.value && setStartMonth(e.target.value)} />
          </label>
          <div className="page-tabs cg-count-tabs" role="tablist">
            <button type="button" className={monthCount === 1 ? 'on' : ''} onClick={() => setMonthCount(1)}>
              1 mês
            </button>
            <button type="button" className={monthCount === 2 ? 'on' : ''} onClick={() => setMonthCount(2)}>
              2 meses
            </button>
          </div>
        </div>

        <div className="cards">
          <Shareable
            fileName="calendario-de-eventos.png"
            blocked={!hasTypes}
            warning={!hasTypes ? 'Cadastre pelo menos um tipo de evento na aba Tipos para compartilhar.' : undefined}
            version={JSON.stringify([calendar, events, startMonth, monthCount])}
            render={(exporting) => (
              <MonthGridCard
                calendarName={calendar.name}
                startMonth={startMonth}
                monthCount={monthCount}
                events={events}
                types={calendar.types}
                exporting={exporting}
              />
            )}
          />
        </div>
      </section>
    </>
  )
}
