// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { loadEvento, saveEvento, turmaWhen } from './ciasEvento'

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
  it('sem nada salvo: "Evangelização CIAs" e uma linha vazia para cada turma', () => {
    const ev = loadEvento(classes)
    expect(ev.name).toBe('Evangelização CIAs')
    expect(ev.church).toBe('')
    expect(ev.image).toBeNull()
    expect(Object.keys(ev.turmas)).toEqual(['bercario', 'adolescentes'])
    expect(ev.turmas.bercario).toEqual({ date: '', time: '', palavra: '', louvor: '' })
  })

  it('salva e lê de volta, com os nomes formatados', () => {
    const ev = loadEvento(classes)
    ev.church = 'Itupiranga'
    ev.turmas.adolescentes = { date: '2026-10-17', time: '15:00', palavra: 'MARCOS', louvor: 'letícia' }
    expect(saveEvento(ev)).toBe(true)
    const back = loadEvento(classes)
    expect(back.church).toBe('Itupiranga')
    expect(back.turmas.adolescentes).toEqual({ date: '2026-10-17', time: '15:00', palavra: 'Marcos', louvor: 'Letícia' })
  })

  it('turma nova na escala ganha a sua linha; dados antigos continuam', () => {
    saveEvento({ ...loadEvento([classes[0]]), church: 'Pioneira' })
    const ev = loadEvento(classes)
    expect(ev.church).toBe('Pioneira')
    expect(ev.turmas.adolescentes).toEqual({ date: '', time: '', palavra: '', louvor: '' })
  })

  it('sem espaço no aparelho (imagem grande demais), avisa em vez de quebrar', () => {
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
