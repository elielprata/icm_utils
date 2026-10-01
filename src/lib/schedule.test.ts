import { describe, expect, it } from 'vitest'
import type { ClassGroup } from '../types'
import { formatDay, fromISO, getMonthBlocks, overrideKey, periodLabel, personFor, toISO } from './schedule'

const days = (dates: Date[]) => dates.map((d) => d.getDate())

describe('getMonthBlocks', () => {
  it('lista os domingos de cada mês', () => {
    const blocks = getMonthBlocks('2026-10', 3, 0)
    expect(blocks.map((b) => b.month)).toEqual([9, 10, 11])
    expect(days(blocks[0].dates)).toEqual([4, 11, 18, 25])
    expect(days(blocks[1].dates)).toEqual([1, 8, 15, 22, 29])
    expect(days(blocks[2].dates)).toEqual([6, 13, 20, 27])
  })

  it('troca de ano no meio do período', () => {
    const blocks = getMonthBlocks('2026-12', 2, 3)
    expect(blocks.map((b) => `${b.month + 1}/${b.year}`)).toEqual(['12/2026', '1/2027'])
    expect(days(blocks[1].dates)).toEqual([6, 13, 20, 27])
  })

  it('aceita qualquer dia da semana', () => {
    const [october] = getMonthBlocks('2026-10', 1, 3)
    expect(days(october.dates)).toEqual([7, 14, 21, 28])
    expect(october.dates.every((d) => d.getDay() === 3)).toBe(true)
  })
})

describe('personFor', () => {
  const group: ClassGroup = { id: 'criancas', name: 'Crianças', emoji: '', color: '', people: ['Divina', 'Manuelle', 'Vanessa'] }
  const date = new Date(2026, 9, 4)

  it('segue o rodízio pelo índice global (continua entre os meses)', () => {
    expect([0, 1, 2, 3, 4].map((i) => personFor(group, date, i, {}))).toEqual([
      'Divina',
      'Manuelle',
      'Vanessa',
      'Divina',
      'Manuelle',
    ])
  })

  it('o ajuste manual tem prioridade', () => {
    expect(personFor(group, date, 0, { [overrideKey(date, 'criancas')]: 'Vanessa' })).toBe('Vanessa')
  })

  it('ignora nomes vazios e devolve vazio sem ninguém', () => {
    expect(personFor({ ...group, people: ['  ', 'Ana'] }, date, 0, {})).toBe('Ana')
    expect(personFor({ ...group, people: [] }, date, 0, {})).toBe('')
  })
})

describe('datas e textos', () => {
  it('formata dia/mês com zero à esquerda', () => {
    expect(formatDay(new Date(2026, 0, 6))).toBe('06/01')
  })

  it('converte YYYY-MM-DD nos dois sentidos sem fuso horário', () => {
    expect(toISO(fromISO('2026-10-07'))).toBe('2026-10-07')
    expect(fromISO('2026-10-07').getDate()).toBe(7)
  })

  it('descreve o período', () => {
    expect(periodLabel(getMonthBlocks('2026-10', 1, 0))).toBe('Outubro 2026')
    expect(periodLabel(getMonthBlocks('2026-10', 3, 0))).toBe('Outubro a Dezembro 2026')
    expect(periodLabel(getMonthBlocks('2026-12', 2, 0))).toBe('Dezembro 2026 a Janeiro 2027')
  })
})
