import { describe, expect, it } from 'vitest'
import {
  addMonths,
  buildMonthGrid,
  currentMonthKey,
  dateLabel,
  defaultTypes,
  eventsForMonth,
  fromMonthKey,
  groupByDate,
  monthLabel,
  nextMonthKey,
  publicEvents,
  toMonthKey,
  type CalendarEvent,
} from './calendario'

describe('grade do mês', () => {
  it('outubro de 2026 começa numa quinta: 4 vazios antes do dia 1, sem sobra depois do 31', () => {
    const grid = buildMonthGrid('2026-10')
    expect(grid).toHaveLength(35)
    expect(grid.slice(0, 4)).toEqual([null, null, null, null])
    expect(grid[4]).toBe('2026-10-01')
    expect(grid[grid.length - 1]).toBe('2026-10-31')
  })

  it('novembro de 2026 começa num domingo: sem vazio antes, 5 vazios depois do 30', () => {
    const grid = buildMonthGrid('2026-11')
    expect(grid).toHaveLength(35)
    expect(grid[0]).toBe('2026-11-01')
    expect(grid[29]).toBe('2026-11-30')
    expect(grid.slice(30)).toEqual([null, null, null, null, null])
  })
})

describe('chaves de mês', () => {
  it('toMonthKey/fromMonthKey convertem nos dois sentidos', () => {
    expect(toMonthKey(2026, 9)).toBe('2026-10')
    expect(fromMonthKey('2026-10')).toEqual({ year: 2026, monthIndex: 9 })
  })

  it('currentMonthKey usa o mês de hoje', () => {
    expect(currentMonthKey()).toBe(toMonthKey(new Date().getFullYear(), new Date().getMonth()))
  })

  it('nextMonthKey e addMonths viram o ano quando preciso', () => {
    expect(nextMonthKey('2026-10')).toBe('2026-11')
    expect(nextMonthKey('2026-12')).toBe('2027-01')
    expect(addMonths('2026-10', -1)).toBe('2026-09')
    expect(addMonths('2026-10', 1)).toBe('2026-11')
  })

  it('monthLabel formata por extenso', () => {
    expect(monthLabel('2026-10')).toBe('Outubro 2026')
  })
})

const ev = (date: string, time: string, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: `${date}-${time}`,
  date,
  time,
  title: 'Evento',
  typeId: 't1',
  ...extra,
})

describe('eventos por mês e por data', () => {
  const events = [ev('2026-10-03', '14:00'), ev('2026-10-17', '08:00'), ev('2026-11-01', '09:00')]

  it('eventsForMonth filtra só o mês pedido', () => {
    expect(eventsForMonth(events, '2026-10').map((e) => e.id)).toEqual([ev('2026-10-03', '14:00').id, ev('2026-10-17', '08:00').id])
    expect(eventsForMonth(events, '2026-11')).toHaveLength(1)
  })

  it('groupByDate ordena por data e, dentro do dia, sem hora primeiro e depois por hora', () => {
    const list = [
      ev('2026-10-17', '19:00', { id: 'c' }),
      ev('2026-10-03', '14:00', { id: 'a' }),
      ev('2026-10-17', '', { id: 'b', time: undefined }),
      ev('2026-10-17', '08:00', { id: 'd' }),
    ]
    const grouped = groupByDate(list)
    expect(grouped.map((g) => g.date)).toEqual(['2026-10-03', '2026-10-17'])
    expect(grouped[1].events.map((e) => e.id)).toEqual(['b', 'd', 'c'])
  })

  it('dateLabel mostra o dia da semana e a data', () => {
    expect(dateLabel('2026-10-11')).toBe('Domingo, 11/10')
  })
})

describe('confirmação do evento', () => {
  it('publicEvents tira os marcados como não confirmados; sem o campo, é confirmado', () => {
    const list = [
      ev('2026-10-03', '14:00', { id: 'a', confirmed: false }),
      ev('2026-10-04', '09:00', { id: 'b', confirmed: true }),
      ev('2026-10-05', '09:00', { id: 'c' }),
    ]
    expect(publicEvents(list).map((e) => e.id)).toEqual(['b', 'c'])
  })
})

describe('tipos de evento', () => {
  it('defaultTypes semeia 2 tipos genéricos com chaves diferentes', () => {
    const types = defaultTypes()
    const values = Object.values(types)
    expect(Object.keys(types)).toHaveLength(2)
    expect(Object.keys(types)[0]).not.toBe(Object.keys(types)[1])
    expect(values.map((t) => t.name)).toEqual(['Evento Geral', 'Evento Local'])
    expect(values.map((t) => t.order)).toEqual([0, 1])
  })
})
