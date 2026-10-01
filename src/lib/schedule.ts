import type { ClassGroup, Overrides } from '../types'

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export interface MonthBlock {
  year: number
  month: number // 0-11
  dates: Date[]
}

const pad = (n: number) => String(n).padStart(2, '0')

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const formatDay = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
export const monthLabel = (b: MonthBlock) => `${MONTHS[b.month]} ${b.year}`

export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
}

/** Todas as datas do dia da semana escolhido, agrupadas por mês. */
export function getMonthBlocks(startMonth: string, months: number, weekday: number): MonthBlock[] {
  const [y, m] = startMonth.split('-').map(Number)
  const blocks: MonthBlock[] = []
  for (let i = 0; i < months; i++) {
    const first = new Date(y, m - 1 + i, 1)
    const block: MonthBlock = { year: first.getFullYear(), month: first.getMonth(), dates: [] }
    const d = new Date(first)
    d.setDate(1 + ((weekday - d.getDay() + 7) % 7))
    while (d.getMonth() === block.month) {
      block.dates.push(new Date(d))
      d.setDate(d.getDate() + 7)
    }
    blocks.push(block)
  }
  return blocks
}

export const overrideKey = (date: Date, classId: string) => `${toISO(date)}|${classId}`

/**
 * Pessoa escalada na data de índice global `index` (o rodízio continua entre os meses).
 * Um ajuste manual para a data tem prioridade.
 */
export function personFor(group: ClassGroup, date: Date, index: number, overrides: Overrides): string {
  const manual = overrides[overrideKey(date, group.id)]
  if (manual) return manual
  const people = group.people.filter((p) => p.trim())
  if (people.length === 0) return ''
  return people[index % people.length]
}

/** "Outubro a Dezembro 2026" */
export function periodLabel(blocks: MonthBlock[]) {
  const first = blocks[0]
  const last = blocks[blocks.length - 1]
  if (first === last) return `${MONTHS[first.month]} ${first.year}`
  if (first.year === last.year) return `${MONTHS[first.month]} a ${MONTHS[last.month]} ${last.year}`
  return `${MONTHS[first.month]} ${first.year} a ${MONTHS[last.month]} ${last.year}`
}

/** "YYYY-MM-DD" → data local */
export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const formatFull = (d: Date) => `${formatDay(d)}/${d.getFullYear()}`
