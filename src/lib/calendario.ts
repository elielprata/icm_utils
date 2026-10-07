import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { fromISO, MONTHS, WEEKDAYS, formatDay } from './schedule'

export interface EventType {
  name: string
  color: string
  /** Ordem de exibição na legenda */
  order: number
}

export interface Calendar {
  id: string
  /** Nome do calendário, mostrado no topo da imagem. Começa vazio. */
  name: string
  /** Chave = código aleatório, lista editável pelo secretário. */
  types: Record<string, EventType>
  /** E-mails (minúsculos) dos secretários. */
  admins: string[]
}

export interface CalendarEvent {
  id: string
  /** YYYY-MM-DD */
  date: string
  /** HH:MM, opcional */
  time?: string
  title: string
  note?: string
  /** Precisa existir em `Calendar.types` */
  typeId: string
  /** `false` = ainda não confirmado: só aparece para quem administra, nunca no link público nem na imagem. */
  confirmed?: boolean
  createdAt?: Timestamp
}

/** Cores sugeridas para os tipos de evento. */
export const TYPE_COLORS = ['#2451B3', '#D97757', '#2F855A', '#BB1626', '#8E44AD', '#0F8B8D']

/** Código aleatório difícil de adivinhar (letras e números). */
function randomCode(length: number): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

/** Dois tipos genéricos de exemplo; o secretário renomeia, adiciona e remove como quiser. */
export function defaultTypes(): Record<string, EventType> {
  return {
    [randomCode(6)]: { name: 'Evento Geral', color: TYPE_COLORS[0], order: 0 },
    [randomCode(6)]: { name: 'Evento Local', color: TYPE_COLORS[1], order: 1 },
  }
}

/* ---------- Grade do mês (lógica pura) ---------- */

const pad2 = (n: number) => String(n).padStart(2, '0')

export const toMonthKey = (year: number, monthIndex: number) => `${year}-${pad2(monthIndex + 1)}`

export function fromMonthKey(key: string): { year: number; monthIndex: number } {
  const [year, month] = key.split('-').map(Number)
  return { year, monthIndex: month - 1 }
}

export function currentMonthKey(): string {
  const now = new Date()
  return toMonthKey(now.getFullYear(), now.getMonth())
}

/** Soma (ou subtrai) meses a uma chave "YYYY-MM", virando o ano quando preciso. */
export function addMonths(key: string, delta: number): string {
  const { year, monthIndex } = fromMonthKey(key)
  const d = new Date(year, monthIndex + delta, 1)
  return toMonthKey(d.getFullYear(), d.getMonth())
}

export const nextMonthKey = (key: string) => addMonths(key, 1)

export const monthLabel = (key: string) => {
  const { year, monthIndex } = fromMonthKey(key)
  return `${MONTHS[monthIndex]} ${year}`
}

/**
 * Datas (YYYY-MM-DD) do mês em semanas de domingo a sábado, com `null` de preenchimento antes do
 * dia 1 e depois do último dia.
 */
export function buildMonthGrid(key: string): (string | null)[] {
  const { year, monthIndex } = fromMonthKey(key)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7
  const cells: (string | null)[] = []
  for (let i = 0; i < totalCells; i++) {
    const day = i - firstWeekday + 1
    cells.push(day >= 1 && day <= daysInMonth ? `${key}-${pad2(day)}` : null)
  }
  return cells
}

export const eventsForMonth = (events: CalendarEvent[], key: string) => events.filter((e) => e.date.slice(0, 7) === key)

/** Só os eventos confirmados: os únicos que aparecem no link público e na imagem compartilhada. */
export const publicEvents = (events: CalendarEvent[]) => events.filter((e) => e.confirmed !== false)

/** Eventos agrupados por data, ordenado; dentro do dia, sem hora primeiro, depois por hora. */
export function groupByDate(events: CalendarEvent[]): { date: string; events: CalendarEvent[] }[] {
  const byDate = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    const list = byDate.get(e.date) ?? []
    list.push(e)
    byDate.set(e.date, list)
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({
      date,
      events: list.slice().sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
    }))
}

/** "Domingo, 11/10" */
export const dateLabel = (iso: string) => `${WEEKDAYS[fromISO(iso).getDay()]}, ${formatDay(fromISO(iso))}`

/* ---------- Firestore ---------- */

const calendarRef = (id: string) => doc(db, 'calendars', id)
const eventsCol = (id: string) => collection(db, 'calendars', id, 'events')
const eventRef = (id: string, eventId: string) => doc(db, 'calendars', id, 'events', eventId)

/** Funciona sem login: sustenta o link público de visualização. */
export function watchCalendar(id: string, onChange: (c: Calendar | null) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    calendarRef(id),
    (snap) => onChange(snap.exists() ? ({ id: snap.id, ...snap.data() } as Calendar) : null),
    onError,
  )
}

/** Funciona sem login: sustenta o link público de visualização. */
export function watchCalendarEvents(id: string, onChange: (e: CalendarEvent[]) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    eventsCol(id),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CalendarEvent)),
    onError,
  )
}

/** "Meus calendários": um secretário pode administrar mais de um. */
export function watchMyCalendars(email: string, onChange: (c: Calendar[]) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'calendars'), where('admins', 'array-contains', email.toLowerCase())),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Calendar)),
    onError,
  )
}

export async function createCalendar(name: string, email: string): Promise<string> {
  const id = randomCode(12)
  await setDoc(calendarRef(id), {
    name,
    types: defaultTypes(),
    admins: [email.toLowerCase()],
    createdAt: serverTimestamp(),
  })
  return id
}

export const updateCalendar = (id: string, patch: Partial<Pick<Calendar, 'name' | 'types' | 'admins'>>) =>
  updateDoc(calendarRef(id), patch)

export async function addEvent(id: string, data: Omit<CalendarEvent, 'id' | 'createdAt'>): Promise<string> {
  const eventId = randomCode(10)
  await setDoc(eventRef(id, eventId), { ...data, createdAt: serverTimestamp() })
  return eventId
}

export const updateEvent = (id: string, eventId: string, patch: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) =>
  updateDoc(eventRef(id, eventId), patch)

export const removeEvent = (id: string, eventId: string) => deleteDoc(eventRef(id, eventId))

/** Link público de visualização (só leitura, sem login). */
export const viewLink = (id: string) => `${location.origin}${location.pathname}#/calendario/ver/${id}`
