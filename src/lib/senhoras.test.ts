import { describe, expect, it } from 'vitest'
import { fromISO, toISO } from './schedule'
import {
  cycleAround,
  firstWednesday,
  isOfficial,
  isScheduleWednesday,
  rotationTable,
  roundAt,
  senhorasMonths,
  weekIndex,
  wednesdayAt,
} from './senhoras'

const iso = (d: Date) => toISO(d)

describe('rotationTable: tabelas oficiais (Orientações para o Trabalho de Senhoras)', () => {
  // Transcritas das páginas do livro; [Palavra, Louvor, Preparo]
  const BOOK: Record<number, number[][]> = {
    3: [[1, 2, 3], [2, 3, 1], [3, 1, 2]],
    4: [[1, 4, 3, 2], [2, 1, 4, 3], [3, 2, 1, 4]],
    5: [[1, 2, 3, 4, 5], [3, 4, 5, 2, 1], [2, 5, 1, 3, 4]],
    6: [[1, 4, 2, 5, 3, 6], [2, 5, 3, 6, 4, 1], [3, 6, 4, 1, 5, 2]],
    7: [[1, 4, 7, 3, 6, 2, 5], [2, 5, 1, 4, 7, 3, 6], [3, 6, 2, 5, 1, 4, 7]],
    8: [[1, 4, 7, 2, 5, 8, 3, 6], [2, 5, 8, 3, 6, 1, 4, 7], [3, 6, 1, 4, 7, 2, 5, 8]],
    9: [[1, 4, 7, 3, 5, 9, 2, 6, 8], [2, 6, 8, 1, 4, 7, 3, 5, 9], [3, 5, 9, 2, 6, 8, 1, 4, 7]],
    10: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [9, 10, 1, 2, 3, 4, 5, 6, 7, 8], [3, 4, 5, 6, 7, 8, 9, 10, 1, 2]],
    11: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [4, 5, 6, 7, 8, 9, 10, 11, 1, 2, 3], [9, 10, 11, 1, 2, 3, 4, 5, 6, 7, 8]],
    12: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], [5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4], [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8]],
  }

  it.each(Object.keys(BOOK).map(Number))('%i servas: igual ao livro', (n) => {
    expect(isOfficial(n)).toBe(true)
    expect(rotationTable(n)).toEqual(BOOK[n])
  })

  // Propriedades que toda tabela precisa ter, oficial ou não
  it.each([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 20])('%i servas: cada uma faz cada função uma vez e ninguém repete na semana', (n) => {
    const table = rotationTable(n)!
    const all = Array.from({ length: n }, (_, i) => i + 1)
    for (const row of table) expect([...row].sort((a, b) => a - b)).toEqual(all)
    for (let week = 0; week < n; week++) {
      expect(new Set(table.map((row) => row[week])).size).toBe(3)
    }
  })

  it('não monta escala com menos de 3 servas', () => {
    expect(rotationTable(2)).toBeNull()
    expect(rotationTable(0)).toBeNull()
  })

  it('acima de 12 não é tabela oficial', () => {
    expect(isOfficial(13)).toBe(false)
  })
})

describe('quartas-feiras da escala', () => {
  it('a 5ª quarta do mês fica fora, mas é informada', () => {
    const [december] = senhorasMonths('2026-12', 1)
    expect(december.dates.map((d) => d.getDate())).toEqual([2, 9, 16, 23])
    expect(december.skipped.map((d) => d.getDate())).toEqual([30])
  })

  it('mês com 4 quartas não pula nada', () => {
    const [october] = senhorasMonths('2026-10', 1)
    expect(october.dates.map((d) => d.getDate())).toEqual([7, 14, 21, 28])
    expect(october.skipped).toEqual([])
  })

  it('reconhece quartas válidas', () => {
    expect(isScheduleWednesday(fromISO('2026-10-07'))).toBe(true)
    expect(isScheduleWednesday(fromISO('2026-12-30'))).toBe(false) // 5ª quarta
    expect(isScheduleWednesday(fromISO('2026-10-08'))).toBe(false) // quinta
    expect(iso(firstWednesday('2027-01'))).toBe('2027-01-06')
  })
})

describe('contagem do rodízio a partir do 1º rodízio', () => {
  const anchor = fromISO('2026-10-07')

  it('conta só as quartas da escala (pula a 5ª)', () => {
    expect(weekIndex(anchor, fromISO('2026-10-07'))).toBe(0)
    expect(weekIndex(anchor, fromISO('2026-12-23'))).toBe(11)
    // 30/12 é a 5ª quarta: 06/01 é só a 12ª depois do início
    expect(weekIndex(anchor, fromISO('2027-01-06'))).toBe(12)
    expect(weekIndex(anchor, fromISO('2026-09-23'))).toBe(-1) // 30/09 é 5ª quarta e não conta
  })

  it('wednesdayAt é o inverso de weekIndex', () => {
    for (const k of [-5, 0, 3, 11, 12, 30]) expect(weekIndex(anchor, wednesdayAt(anchor, k))).toBe(k)
    expect(iso(wednesdayAt(anchor, 12))).toBe('2027-01-06')
  })

  it('com 9 servas, janeiro de 2027 começa no 4º rodízio', () => {
    expect(roundAt(anchor, fromISO('2027-01-06'), 9) + 1).toBe(4)
    expect(roundAt(anchor, fromISO('2026-12-09'), 9)).toBe(0) // recomeça
  })

  it('datas antes do 1º rodízio também caem no ciclo certo', () => {
    expect(roundAt(anchor, fromISO('2026-09-23'), 9) + 1).toBe(9)
  })

  it('informa o ciclo atual e quando começa o próximo', () => {
    const cycle = cycleAround(anchor, fromISO('2027-01-06'), 9)
    expect([cycle.start, cycle.end, cycle.next].map(iso)).toEqual(['2026-12-09', '2027-02-10', '2027-02-17'])
  })
})
