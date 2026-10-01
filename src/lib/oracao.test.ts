import { describe, expect, it, vi } from 'vitest'
import { Timestamp } from 'firebase/firestore'

// A lógica pura não precisa do Firebase de verdade.
vi.mock('./firebase', () => ({ db: {} }))

const {
  bySlot,
  canSelfManage,
  entryId,
  formatRange,
  minFill,
  hasMotivos,
  parseMotivos,
  nextLevel,
  openSlots,
  randomCode,
  shiftOf,
  slotLabel,
  SLOTS,
} = await import('./oracao')

type E = { id: string; slot: number; level: number; name: string; church: string; createdAt?: Timestamp }
const e = (slot: number, level: number, extra: Partial<E> = {}): E => ({ id: entryId(slot, level), slot, level, name: 'Ana', church: 'x', ...extra })

describe('horários', () => {
  it('rotula os 96 horários de 15 minutos', () => {
    expect(SLOTS).toBe(96)
    expect(slotLabel(0)).toBe('00:00 – 00:15')
    expect(slotLabel(13)).toBe('03:15 – 03:30')
    expect(slotLabel(95)).toBe('23:45 – 00:00')
  })

  it('separa em 4 turnos de 6 horas', () => {
    expect([0, 23, 24, 47, 48, 72, 95].map(shiftOf)).toEqual([0, 0, 1, 1, 2, 3, 3])
  })
})

describe('regra de preenchimento', () => {
  it('agrupa por horário e ordena pela posição', () => {
    const slots = bySlot([e(5, 1), e(5, 0), e(0, 0)])
    expect(slots).toHaveLength(96)
    expect(slots[5].map((x) => x.level)).toEqual([0, 1])
  })

  it('enquanto houver vaga, só os horários vazios ficam abertos', () => {
    const slots = bySlot([e(0, 0), e(1, 0), e(1, 1)])
    const open = openSlots(slots)
    expect(minFill(slots)).toBe(0)
    expect(open.has(0)).toBe(false)
    expect(open.has(1)).toBe(false)
    expect(open.size).toBe(94)
  })

  it('com todos preenchidos, todos reabrem (menos os que já têm mais gente)', () => {
    const all = Array.from({ length: 96 }, (_, s) => e(s, 0))
    const slots = bySlot([...all, e(7, 1)])
    const open = openSlots(slots)
    expect(minFill(slots)).toBe(1)
    expect(open.size).toBe(95)
    expect(open.has(7)).toBe(false)
  })

  it('ao trocar, a própria inscrição conta como já tendo saído', () => {
    const all = Array.from({ length: 96 }, (_, s) => e(s, 0))
    // Sem ignorar: todos com 1, todos abertos. Ignorando o 0_0: o horário 0 fica vazio e é o único aberto.
    expect(openSlots(bySlot(all)).size).toBe(96)
    expect([...openSlots(bySlot(all), '0_0')]).toEqual([0])
  })

  it('a próxima posição preenche buracos deixados por remoções', () => {
    expect(nextLevel([])).toBe(0)
    expect(nextLevel([e(3, 0), e(3, 1)])).toBe(2)
    expect(nextLevel([e(3, 1)])).toBe(0)
  })
})

describe('trocar ou cancelar sozinho', () => {
  const day = 24 * 60 * 60 * 1000
  const now = Date.parse('2026-10-15T12:00:00Z')
  const created = (ms: number) => e(0, 0, { createdAt: Timestamp.fromMillis(ms) })

  it('pode antes do início do período', () => {
    expect(canSelfManage({ start: '2026-11-01' }, created(now - 10 * day), now)).toBe(true)
  })

  it('pode nas primeiras 24 h depois de se inscrever, mesmo com o período em andamento', () => {
    expect(canSelfManage({ start: '2026-10-01' }, created(now - 2 * 60 * 60 * 1000), now)).toBe(true)
  })

  it('não pode depois do início e das 24 h', () => {
    expect(canSelfManage({ start: '2026-10-01' }, created(now - 2 * day), now)).toBe(false)
  })
})

describe('textos', () => {
  it('motivos colados do PDF: títulos sem marcador viram seções', () => {
    const text = [
      'MOTIVOS PESSOAIS ',
      '• Entrega ao Senhor para servir com dedicação.',
      '• Aperfeiçoamento do entendimento de Obra. ',
      'MOTIVOS GERAIS',
      '• Conservação da liberdade de Culto.',
      '• Saúde dos servos.',
    ].join('\n')
    expect(parseMotivos(text)).toEqual([
      { title: 'MOTIVOS PESSOAIS', items: ['Entrega ao Senhor para servir com dedicação.', 'Aperfeiçoamento do entendimento de Obra.'] },
      { title: 'MOTIVOS GERAIS', items: ['Conservação da liberdade de Culto.', 'Saúde dos servos.'] },
    ])
  })

  it('motivos: linha em branco separa grupos e o título "Motivos de oração" é ignorado', () => {
    const text = 'MOTIVOS DE ORAÇÃO\n\n* Pela nossa Pátria 🇧🇷  \n- Pelas autoridades\n   \n• Pelas eleições'
    expect(parseMotivos(text)).toEqual([{ items: ['Pela nossa Pátria 🇧🇷', 'Pelas autoridades'] }, { items: ['Pelas eleições'] }])
  })

  it('motivos sem nenhum marcador: toda linha é item', () => {
    expect(parseMotivos('Pela nação\nPelas famílias')).toEqual([{ items: ['Pela nação', 'Pelas famílias'] }])
    expect(parseMotivos(undefined)).toEqual([])
    expect(hasMotivos('  \n ')).toBe(false)
  })

  it('formata o período', () => {
    expect(formatRange({ start: '2026-09-01', end: '2026-09-30' })).toBe('01/09/2026 a 30/09/2026')
  })

  it('gera códigos aleatórios sem caracteres confusos', () => {
    const code = randomCode(12)
    expect(code).toMatch(/^[a-km-zA-HJ-NP-Z2-9]{12}$/)
    expect(randomCode(12)).not.toBe(code)
  })
})
