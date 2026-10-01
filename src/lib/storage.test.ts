// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { loadSenhoras, loadState, saveSenhoras } from './storage'

beforeEach(() => localStorage.clear())

describe('Escala de Senhoras: dados salvos', () => {
  it('sem nada salvo: 3 meses, número do rodízio ligado e 1º rodízio na 1ª quarta do mês', () => {
    const state = loadSenhoras()
    expect(state.months).toBe(3)
    expect(state.showRoundsInImage).toBe(true)
    expect(state.anchor.slice(0, 7)).toBe(state.startMonth)
  })

  it('converte o formato antigo ("1ª quarta começa no rodízio N") para a quarta do 1º rodízio', () => {
    localStorage.setItem('escala-senhoras:v1', JSON.stringify({ startMonth: '2027-01', months: 3, startRound: 4, people: ['A', 'B'], overrides: {} }))
    const state = loadSenhoras()
    // 06/01/2027 era o 4º rodízio → o 1º foi 3 quartas de escala antes (30/12 é 5ª quarta e não conta)
    expect(state.anchor).toBe('2026-12-09')
    expect(state).not.toHaveProperty('startRound')
  })

  it('formato antigo sem rodízio informado: 1º rodízio na 1ª quarta do mês salvo', () => {
    localStorage.setItem('escala-senhoras:v1', JSON.stringify({ startMonth: '2026-10', people: [] }))
    expect(loadSenhoras().anchor).toBe('2026-10-07')
  })

  it('salva e lê de volta', () => {
    const state = { ...loadSenhoras(), people: ['Ana', 'Bia', 'Cida'], anchor: '2026-10-14' }
    saveSenhoras(state)
    expect(loadSenhoras()).toEqual(state)
  })

  it('dados corrompidos voltam ao padrão', () => {
    localStorage.setItem('escala-senhoras:v1', '{quebrado')
    expect(loadSenhoras().people).toEqual([])
  })
})

describe('nomes salvos ficam com a primeira letra maiúscula', () => {
  it('servas das Senhoras', () => {
    localStorage.setItem('escala-senhoras:v1', JSON.stringify({ startMonth: '2026-10', people: ['ANA PAULA', 'mª rosa'] }))
    expect(loadSenhoras().people).toEqual(['Ana Paula', 'Mª Rosa'])
  })

  it('professoras das CIAs', () => {
    localStorage.setItem(
      'escala-professores:v1',
      JSON.stringify({ config: {}, classes: [{ id: 'c', name: 'Crianças', emoji: '', color: '', people: ['DIVINA', 'joão DA silva'] }], overrides: {} }),
    )
    expect(loadState().classes[0].people).toEqual(['Divina', 'João da Silva'])
  })
})

describe('Escala das CIAs: dados salvos', () => {
  it('completa a configuração salva com os valores padrão', () => {
    localStorage.setItem('escala-professores:v1', JSON.stringify({ config: { startMonth: '2026-10' }, classes: [], overrides: {} }))
    const state = loadState()
    expect(state.config).toMatchObject({ startMonth: '2026-10', months: 3, weekday: 0 })
  })
})
