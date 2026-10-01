import { getMonthBlocks, type MonthBlock } from './schedule'

export const ROLES = ['Palavra', 'Louvor', 'Preparo'] as const
export type Role = (typeof ROLES)[number]

/** Quarta-feira */
export const SENHORAS_WEEKDAY = 3

/**
 * Tabelas oficiais de rodízio semanal (Orientações para o Trabalho de Senhoras, 3 a 12 servas).
 * Para cada quantidade de servas: [Palavra, Louvor, Preparo], cada linha com o número da serva
 * em cada semana do rodízio (1º, 2º, 3º…).
 */
const OFFICIAL: Record<number, [number[], number[], number[]]> = {
  3: [
    [1, 2, 3],
    [2, 3, 1],
    [3, 1, 2],
  ],
  4: [
    [1, 4, 3, 2],
    [2, 1, 4, 3],
    [3, 2, 1, 4],
  ],
  5: [
    [1, 2, 3, 4, 5],
    [3, 4, 5, 2, 1],
    [2, 5, 1, 3, 4],
  ],
  6: [
    [1, 4, 2, 5, 3, 6],
    [2, 5, 3, 6, 4, 1],
    [3, 6, 4, 1, 5, 2],
  ],
  7: [
    [1, 4, 7, 3, 6, 2, 5],
    [2, 5, 1, 4, 7, 3, 6],
    [3, 6, 2, 5, 1, 4, 7],
  ],
  8: [
    [1, 4, 7, 2, 5, 8, 3, 6],
    [2, 5, 8, 3, 6, 1, 4, 7],
    [3, 6, 1, 4, 7, 2, 5, 8],
  ],
  9: [
    [1, 4, 7, 3, 5, 9, 2, 6, 8],
    [2, 6, 8, 1, 4, 7, 3, 5, 9],
    [3, 5, 9, 2, 6, 8, 1, 4, 7],
  ],
  10: [
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [9, 10, 1, 2, 3, 4, 5, 6, 7, 8],
    [3, 4, 5, 6, 7, 8, 9, 10, 1, 2],
  ],
  11: [
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    [4, 5, 6, 7, 8, 9, 10, 11, 1, 2, 3],
    [9, 10, 11, 1, 2, 3, 4, 5, 6, 7, 8],
  ],
  12: [
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    [5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4],
    [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8],
  ],
}

export const MIN_SERVAS = 3

export const isOfficial = (n: number) => n in OFFICIAL

/**
 * Tabela de rodízio para `n` servas: [Palavra, Louvor, Preparo] × semanas (números 1..n).
 * Acima de 12 (não há tabela oficial), usa um deslocamento de um terço do grupo entre as funções.
 */
export function rotationTable(n: number): number[][] | null {
  if (n < MIN_SERVAS) return null
  if (OFFICIAL[n]) return OFFICIAL[n]
  const step = Math.floor(n / 3)
  const week = Array.from({ length: n }, (_, k) => k)
  return [0, step, 2 * step].map((offset) => week.map((k) => ((k + offset) % n) + 1))
}

export interface SenhorasMonth extends MonthBlock {
  /** 5ª quarta-feira do mês, quando existe: não há escala nesse dia. */
  skipped: Date[]
}

/** Quartas-feiras do período; a 5ª quarta-feira do mês fica separada em `skipped`. */
export function senhorasMonths(startMonth: string, months: number): SenhorasMonth[] {
  return getMonthBlocks(startMonth, months, SENHORAS_WEEKDAY).map((b) => ({
    ...b,
    dates: b.dates.slice(0, 4),
    skipped: b.dates.slice(4),
  }))
}

/* ---------- Contagem do rodízio a partir da quarta do 1º rodízio ---------- */

/** A 5ª quarta-feira do mês cai sempre a partir do dia 29. */
const isFifth = (d: Date) => d.getDate() > 28

/** Quarta-feira que entra na escala (não é a 5ª do mês). */
export const isScheduleWednesday = (d: Date) => d.getDay() === SENHORAS_WEEKDAY && !isFifth(d)

/** Primeira quarta-feira do mês (YYYY-MM). */
export const firstWednesday = (month: string) => senhorasMonths(month, 1)[0].dates[0]

/** Quantas quartas de escala há da `anchor` até `date` (0 = a própria anchor; negativo = antes dela). */
export function weekIndex(anchor: Date, date: Date): number {
  const d = new Date(anchor)
  let index = 0
  while (d < date) {
    d.setDate(d.getDate() + 7)
    if (!isFifth(d)) index++
  }
  while (d > date) {
    d.setDate(d.getDate() - 7)
    if (!isFifth(d)) index--
  }
  return index
}

/** A quarta de escala que fica `k` semanas de escala depois (ou antes) da `anchor`. */
export function wednesdayAt(anchor: Date, k: number): Date {
  const d = new Date(anchor)
  for (let left = k; left > 0; ) {
    d.setDate(d.getDate() + 7)
    if (!isFifth(d)) left--
  }
  for (let left = k; left < 0; ) {
    d.setDate(d.getDate() - 7)
    if (!isFifth(d)) left++
  }
  return d
}

/** Semana do rodízio (0-based) em `date`, sabendo que a `anchor` foi o 1º rodízio. */
export const roundAt = (anchor: Date, date: Date, n: number) => ((weekIndex(anchor, date) % n) + n) % n

export interface CycleInfo {
  start: Date
  end: Date
  next: Date
}

/** Ciclo completo (todas passam pelas três funções) que contém `date`. */
export function cycleAround(anchor: Date, date: Date, n: number): CycleInfo {
  const index = weekIndex(anchor, date)
  const first = index - (((index % n) + n) % n)
  return { start: wednesdayAt(anchor, first), end: wednesdayAt(anchor, first + n - 1), next: wednesdayAt(anchor, first + n) }
}
