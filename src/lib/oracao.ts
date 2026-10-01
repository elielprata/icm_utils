import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'

/** 24 horas em horários de 15 minutos */
export const SLOTS = 96
export const NAME_MAX = 40
export const MOTIVOS_MAX = 2000

export interface Church {
  name: string
  color: string
  /** Ordem de exibição na legenda */
  order: number
}

export interface Period {
  id: string
  /** Título curto do período (ex.: "Ministérios") */
  motivo: string
  /** Motivos de oração, um por linha */
  motivos?: string
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
  createdAt?: Timestamp
}

/** Inscrição feita neste celular: a chave permite trocar ou cancelar sem o coordenador. */
export interface MyEntry {
  id: string
  key: string
}

/** Cores sugeridas para as igrejas (as mesmas da planilha) */
export const CHURCH_COLORS = ['#e8892b', '#1f1f1f', '#4f9a3c', '#d7261e', '#1f4fd1', '#8e44ad', '#0f8b8d', '#c2185b']

const pad = (n: number) => String(n).padStart(2, '0')
const clock = (minutes: number) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`
export const slotLabel = (slot: number) => `${clock(slot * 15)} – ${clock(slot * 15 + 15)}`
/** Só a hora em que o horário começa (cada um dura 15 min), ex.: "03:15" */
export const slotStart = (slot: number) => clock(slot * 15)

/** Turnos de 6 horas (24 horários cada) */
export const SHIFTS = [
  { name: 'Madrugada', hours: '00–06h' },
  { name: 'Manhã', hours: '06–12h' },
  { name: 'Tarde', hours: '12–18h' },
  { name: 'Noite', hours: '18–24h' },
]
export const SLOTS_PER_SHIFT = SLOTS / SHIFTS.length
export const shiftOf = (slot: number) => Math.floor(slot / SLOTS_PER_SHIFT)

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

/**
 * Horários abertos para inscrição: só os que têm a menor quantidade de pessoas.
 * `ignore` = inscrição que está sendo trocada (conta como se já tivesse saído).
 */
export function openSlots(slots: Entry[][], ignore?: string): Set<number> {
  const counts = slots.map((s) => s.filter((e) => e.id !== ignore).length)
  const min = Math.min(...counts)
  const open = new Set<number>()
  counts.forEach((c, slot) => c === min && open.add(slot))
  return open
}

export const minFill = (slots: Entry[][]) => Math.min(...slots.map((s) => s.length))

/** Próxima posição livre no horário (preenche buracos deixados por remoções). */
export function nextLevel(slot: Entry[]): number {
  const used = new Set(slot.map((e) => e.level))
  let level = 0
  while (used.has(level)) level++
  return level
}

/** A pessoa ainda pode trocar ou cancelar sozinha: antes do início do período ou até 24 h depois de se inscrever. */
export function canSelfManage(period: Pick<Period, 'start'>, entry: Entry, now = Date.now()): boolean {
  const start = Date.parse(`${period.start}T00:00:00Z`)
  const created = entry.createdAt?.toMillis() ?? now
  return now < start || now < created + 24 * 60 * 60 * 1000
}

/* ---------- Firestore ---------- */

const periodRef = (id: string) => doc(db, 'periods', id)
const entriesCol = (periodId: string) => collection(db, 'periods', periodId, 'entries')
const entryRef = (periodId: string, id: string) => doc(db, 'periods', periodId, 'entries', id)
const secretRef = (periodId: string, id: string) => doc(db, 'periods', periodId, 'secrets', id)
const releaseRef = (periodId: string, id: string) => doc(db, 'periods', periodId, 'releases', id)

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

const entryData = (slot: number, level: number, name: string, church: string) => ({
  slot,
  level,
  name: name.trim().slice(0, NAME_MAX),
  church,
  createdAt: serverTimestamp(),
})

/**
 * Inscrição pelo link. O id do documento é `horário_posição`: se duas pessoas tentarem a mesma vaga
 * ao mesmo tempo, o banco aceita só a primeira (a segunda recebe erro de permissão).
 * Junto vai uma chave secreta (ilegível para os outros) que permite trocar ou cancelar depois.
 */
export async function signUp(periodId: string, slot: number, level: number, name: string, church: string): Promise<MyEntry> {
  const mine = { id: entryId(slot, level), key: randomCode(32) }
  const batch = writeBatch(db)
  batch.set(entryRef(periodId, mine.id), entryData(slot, level, name, church))
  batch.set(secretRef(periodId, mine.id), { key: mine.key })
  await batch.commit()
  return mine
}

/** Libera a inscrição própria (prova a chave secreta) dentro de um lote de escrita. */
function releaseInBatch(batch: ReturnType<typeof writeBatch>, periodId: string, mine: MyEntry) {
  batch.set(releaseRef(periodId, mine.id), { key: mine.key })
  batch.delete(entryRef(periodId, mine.id))
  batch.delete(secretRef(periodId, mine.id))
}

export async function cancelMine(periodId: string, mine: MyEntry) {
  const batch = writeBatch(db)
  releaseInBatch(batch, periodId, mine)
  await batch.commit()
}

/** Troca a própria inscrição de horário (sai do antigo e entra no novo de uma vez só). */
export async function moveMine(
  periodId: string,
  mine: MyEntry,
  slot: number,
  level: number,
  name: string,
  church: string,
): Promise<MyEntry> {
  const next = { id: entryId(slot, level), key: randomCode(32) }
  const batch = writeBatch(db)
  releaseInBatch(batch, periodId, mine)
  batch.set(entryRef(periodId, next.id), entryData(slot, level, name, church))
  batch.set(secretRef(periodId, next.id), { key: next.key })
  await batch.commit()
  return next
}

/* ---------- Coordenador (sem a regra das vagas) ---------- */

export const adminAdd = (periodId: string, slot: number, level: number, name: string, church: string) =>
  setDoc(entryRef(periodId, entryId(slot, level)), entryData(slot, level, name, church))

export async function adminMove(periodId: string, entry: Entry, slot: number, level: number) {
  const batch = writeBatch(db)
  batch.delete(entryRef(periodId, entry.id))
  batch.set(entryRef(periodId, entryId(slot, level)), entryData(slot, level, entry.name, entry.church))
  await batch.commit()
}

export const adminUpdate = (periodId: string, id: string, data: Partial<Pick<Entry, 'name' | 'church'>>) =>
  updateDoc(entryRef(periodId, id), data)

export async function adminRemove(periodId: string, id: string) {
  const batch = writeBatch(db)
  batch.delete(entryRef(periodId, id))
  await batch.commit()
}

/* ---------- Textos ---------- */

/** Link de inscrição de uma igreja */
export const signupLink = (periodId: string, church: string) =>
  `${location.origin}${location.pathname}#/oracao/${periodId}/${church}`

export interface MotivoSection {
  /** Título da seção (linha sem marcador), ex.: "MOTIVOS PESSOAIS" */
  title?: string
  items: string[]
}

const BULLET = /^\s*[*\-•]\s*/

/**
 * Organiza os motivos como no papel:
 * - linha com marcador ("•", "*" ou "-") → item;
 * - linha sem marcador → título de seção em negrito;
 * - linha em branco → separa grupos.
 * Se o texto não tiver nenhum marcador, toda linha é item. O título "Motivos de oração" é ignorado
 * (a página já mostra).
 */
export function parseMotivos(text = ''): MotivoSection[] {
  const lines = text.split('\n').map((l) => l.trim())
  const hasBullets = lines.some((l) => BULLET.test(l) && l.replace(BULLET, ''))
  const sections: MotivoSection[] = []
  let current: MotivoSection | null = null
  const close = () => {
    if (current && (current.title || current.items.length)) sections.push(current)
    current = null
  }

  for (const line of lines) {
    if (!line) {
      close()
      continue
    }
    if (/^motivos de ora[çc][ãa]o:?$/i.test(line)) continue
    const isItem = !hasBullets || BULLET.test(line)
    const content = line.replace(BULLET, '').trim()
    if (!content) continue
    if (isItem) {
      current ??= { items: [] }
      current.items.push(content)
    } else {
      close()
      current = { title: content, items: [] }
    }
  }
  close()
  return sections
}

export const hasMotivos = (text?: string) => parseMotivos(text).length > 0

export const formatDate = (iso: string) => iso.split('-').reverse().join('/')

export function formatRange(p: Pick<Period, 'start' | 'end'>) {
  return `${formatDate(p.start)} a ${formatDate(p.end)}`
}
