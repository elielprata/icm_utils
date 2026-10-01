import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'

/** 24 horas em horários de 15 minutos */
export const SLOTS = 96
export const NAME_MAX = 40

export interface Church {
  name: string
  color: string
  /** Ordem de exibição na legenda */
  order: number
}

export interface Period {
  id: string
  motivo: string
  /** YYYY-MM-DD */
  start: string
  end: string
  /** Chave = código aleatório da igreja, usado no link de inscrição */
  churches: Record<string, Church>
  /** E-mails (minúsculos) dos coordenadores */
  admins: string[]
}

export interface Entry {
  id: string
  slot: number
  /** Posição da pessoa no horário (0 = primeira) */
  level: number
  name: string
  church: string
}

/** Cores sugeridas para as igrejas (as mesmas da planilha) */
export const CHURCH_COLORS = ['#e8892b', '#1f1f1f', '#4f9a3c', '#d7261e', '#1f4fd1', '#8e44ad', '#0f8b8d', '#c2185b']

const pad = (n: number) => String(n).padStart(2, '0')
const clock = (minutes: number) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`
export const slotLabel = (slot: number) => `${clock(slot * 15)} – ${clock(slot * 15 + 15)}`

/** Código aleatório difícil de adivinhar (letras e números). */
export function randomCode(length: number): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

export const entryId = (slot: number, level: number) => `${slot}_${level}`

/* ---------- Regra de preenchimento ---------- */

/** Pessoas por horário (índice = horário). */
export function bySlot(entries: Entry[]): Entry[][] {
  const slots: Entry[][] = Array.from({ length: SLOTS }, () => [])
  for (const e of entries) slots[e.slot]?.push(e)
  for (const s of slots) s.sort((a, b) => a.level - b.level)
  return slots
}

/** Menor quantidade de pessoas entre todos os horários: só esses horários aceitam inscrição. */
export const minFill = (slots: Entry[][]) => Math.min(...slots.map((s) => s.length))

/** Próxima posição livre no horário (preenche buracos deixados por remoções). */
export function nextLevel(slot: Entry[]): number {
  const used = new Set(slot.map((e) => e.level))
  let level = 0
  while (used.has(level)) level++
  return level
}

/* ---------- Firestore ---------- */

const periodRef = (id: string) => doc(db, 'periods', id)
const entriesCol = (periodId: string) => collection(db, 'periods', periodId, 'entries')

export function watchPeriod(id: string, onChange: (p: Period | null) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    periodRef(id),
    (snap) => onChange(snap.exists() ? ({ id: snap.id, ...snap.data() } as Period) : null),
    onError,
  )
}

export function watchEntries(periodId: string, onChange: (e: Entry[]) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    entriesCol(periodId),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Entry)),
    onError,
  )
}

export function watchMyPeriods(email: string, onChange: (p: Period[]) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'periods'), where('admins', 'array-contains', email.toLowerCase())),
    (snap) =>
      onChange(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Period).sort((a, b) => b.start.localeCompare(a.start)),
      ),
    onError,
  )
}

export async function createPeriod(data: Omit<Period, 'id'>): Promise<string> {
  const id = randomCode(12)
  await setDoc(periodRef(id), { ...data, createdAt: serverTimestamp() })
  return id
}

export const updatePeriod = (id: string, data: Partial<Omit<Period, 'id'>>) => updateDoc(periodRef(id), data)

/**
 * Agenda `name` no horário. O id do documento é `horário_posição`: se duas pessoas tentarem a mesma
 * vaga ao mesmo tempo, o banco aceita só a primeira (a segunda recebe erro de permissão).
 */
export function addEntry(periodId: string, slot: number, level: number, name: string, church: string) {
  return setDoc(doc(entriesCol(periodId), entryId(slot, level)), {
    slot,
    level,
    name: name.trim().slice(0, NAME_MAX),
    church,
    createdAt: serverTimestamp(),
  })
}

export const removeEntry = (periodId: string, id: string) => deleteDoc(doc(entriesCol(periodId), id))

/** Link de inscrição de uma igreja */
export const signupLink = (periodId: string, church: string) =>
  `${location.origin}${location.pathname}#/oracao/${periodId}/${church}`

export function formatRange(p: Pick<Period, 'start' | 'end'>) {
  const f = (iso: string) => iso.split('-').reverse().join('/')
  return `${f(p.start)} a ${f(p.end)}`
}
