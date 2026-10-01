// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { editTurma, isTurmaFilled, loadEvento, saveEvento, turmaWhen, visibleTurmas } from './ciasEvento'

const classes = [
  { id: 'bercario', name: '0 a 3 anos', emoji: '🍼', color: '#e8457f', people: ['Ana'] },
  { id: 'adolescentes', name: 'Adolescentes', emoji: '🎧', color: '#e0392f', people: [] },
]

beforeEach(() => localStorage.clear())

describe('turmaWhen: dia e horário de cada turma', () => {
  it('dia da semana, data e horário', () => {
    expect(turmaWhen({ date: '2026-10-18', time: '09:00' })).toBe('Domingo, 18/10 · 09:00')
    expect(turmaWhen({ date: '2026-10-17', time: '15:00' })).toBe('Sábado, 17/10 · 15:00')
  })

  it('só a data ou só o horário', () => {
    expect(turmaWhen({ date: '2026-10-18', time: '' })).toBe('Domingo, 18/10')
    expect(turmaWhen({ date: '', time: '15:00' })).toBe('15:00')
    expect(turmaWhen({ date: '', time: '' })).toBe('')
  })
})

describe('loadEvento / saveEvento', () => {
  it('sem nada salvo: nome vazio e uma linha vazia para cada turma', () => {
    const ev = loadEvento(classes)
    expect(ev.name).toBe('')
    expect(ev.church).toBe('')
    expect(ev).not.toHaveProperty('image')
    expect(Object.keys(ev.turmas)).toEqual(['bercario', 'adolescentes'])
    expect(ev.turmas.bercario).toEqual({ date: '', time: '', palavra: '', louvor: '', show: false })
  })

  it('salva e lê de volta, com os nomes formatados', () => {
    const ev = loadEvento(classes)
    ev.church = 'Itupiranga'
    ev.turmas.adolescentes = { date: '2026-10-17', time: '15:00', palavra: 'MARCOS', louvor: 'letícia', show: true }
    expect(saveEvento(ev)).toBe(true)
    const back = loadEvento(classes)
    expect(back.church).toBe('Itupiranga')
    expect(back.turmas.adolescentes).toEqual({ date: '2026-10-17', time: '15:00', palavra: 'Marcos', louvor: 'Letícia', show: true })
  })

  it('turma nova na escala ganha a sua linha; dados antigos continuam', () => {
    saveEvento({ ...loadEvento([classes[0]]), church: 'Pioneira' })
    const ev = loadEvento(classes)
    expect(ev.church).toBe('Pioneira')
    expect(ev.turmas.adolescentes).toEqual({ date: '', time: '', palavra: '', louvor: '', show: false })
  })

  it('imagem salva por versões antigas é descartada (a arte agora vem do site)', () => {
    localStorage.setItem('cias-evento:v1', JSON.stringify({ name: 'X', image: 'data:image/webp;base64,AAAA', turmas: {} }))
    const ev = loadEvento(classes)
    expect(ev).not.toHaveProperty('image')
    saveEvento(ev)
    expect(localStorage.getItem('cias-evento:v1')).not.toContain('image')
  })

  it('sem espaço no aparelho, avisa em vez de quebrar', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new DOMException('cheio', 'QuotaExceededError')
    }
    try {
      expect(saveEvento(loadEvento(classes))).toBe(false)
    } finally {
      Storage.prototype.setItem = original
    }
  })
})

describe('quais turmas entram na imagem (checkbox "Mostrar na imagem")', () => {
  const vazia = { date: '', time: '', palavra: '', louvor: '', show: false }

  it('turma com qualquer campo preenchido conta como preenchida', () => {
    expect(isTurmaFilled(vazia)).toBe(false)
    expect(isTurmaFilled({ ...vazia, palavra: 'Ana' })).toBe(true)
    expect(isTurmaFilled({ ...vazia, time: '09:00' })).toBe(true)
    expect(isTurmaFilled({ ...vazia, palavra: '   ' })).toBe(false)
  })

  it('entram só as marcadas, mesmo que outras estejam preenchidas', () => {
    const turmas = {
      bercario: { ...vazia, palavra: 'Ana', show: false },
      adolescentes: { ...vazia, louvor: 'Eva', show: true },
    }
    expect(visibleTurmas(classes, turmas).map((c) => c.id)).toEqual(['adolescentes'])
    expect(visibleTurmas(classes, { bercario: vazia, adolescentes: vazia })).toEqual([])
  })

  it('começar a preencher uma turma vazia marca o checkbox sozinho', () => {
    expect(editTurma(vazia, { palavra: 'Ana' }).show).toBe(true)
  })

  it('se a pessoa desmarcou, continuar editando não marca de novo', () => {
    const desmarcada = { ...vazia, palavra: 'Ana', show: false }
    expect(editTurma(desmarcada, { louvor: 'Bia' }).show).toBe(false)
  })

  it('marcar ou desmarcar pelo checkbox vale', () => {
    expect(editTurma(vazia, { show: true }).show).toBe(true)
    expect(editTurma({ ...vazia, palavra: 'Ana', show: true }, { show: false }).show).toBe(false)
  })

  it('dados salvos antes do checkbox: marcadas as que estavam preenchidas', () => {
    localStorage.setItem(
      'cias-evento:v1',
      JSON.stringify({ name: 'X', turmas: { bercario: { date: '', time: '', palavra: 'Ana', louvor: '' }, adolescentes: { date: '', time: '', palavra: '', louvor: '' } } }),
    )
    const ev = loadEvento(classes)
    expect(ev.turmas.bercario.show).toBe(true)
    expect(ev.turmas.adolescentes.show).toBe(false)
  })
})
