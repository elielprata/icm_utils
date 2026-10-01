import type { AppState, SenhorasState } from '../types'
import { currentMonth, toISO } from './schedule'
import { firstWednesday, wednesdayAt } from './senhoras'

function load<T extends object>(key: string, defaults: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return { ...defaults, ...(JSON.parse(raw) as Partial<T>) }
  } catch {
    /* ignora dados corrompidos */
  }
  return defaults
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* sem storage disponível */
  }
}

/* ---------- Escala das CIAs ---------- */

const CIAS_KEY = 'escala-professores:v1'

export function defaultState(): AppState {
  return {
    config: { startMonth: currentMonth(), months: 3, weekday: 0 },
    classes: [
      { id: 'bercario', name: '0 a 3 anos', emoji: '🍼', color: '#e8457f', enabled: true, people: [] },
      { id: 'criancas', name: 'Crianças', emoji: '🎨', color: '#f2a20c', enabled: true, people: [] },
      { id: 'intermediarios', name: 'Intermediários', emoji: '📖', color: '#1f6fd1', enabled: true, people: [] },
      { id: 'adolescentes', name: 'Adolescentes', emoji: '🎧', color: '#e0392f', enabled: true, people: [] },
    ],
    overrides: {},
  }
}

export function loadState(): AppState {
  const base = defaultState()
  const saved = load(CIAS_KEY, base)
  return { ...saved, config: { ...base.config, ...saved.config } }
}

export const saveState = (state: AppState) => save(CIAS_KEY, state)

/* ---------- Escala do Trabalho de Senhoras ---------- */

const SENHORAS_KEY = 'escala-senhoras:v1'

export function defaultSenhoras(): SenhorasState {
  const startMonth = currentMonth()
  return {
    startMonth,
    months: 3,
    anchor: toISO(firstWednesday(startMonth)),
    showRoundsInImage: true,
    people: [],
    overrides: {},
  }
}

export function loadSenhoras(): SenhorasState {
  const saved = load<Partial<SenhorasState> & { startRound?: number }>(SENHORAS_KEY, {})
  const { startRound, ...state } = { ...defaultSenhoras(), ...saved }
  // Versão anterior guardava "a 1ª quarta começa no rodízio N"; converte para a quarta do 1º rodízio.
  if (!saved.anchor) {
    state.anchor = toISO(wednesdayAt(firstWednesday(state.startMonth), -((startRound ?? 1) - 1)))
  }
  return state
}

export const saveSenhoras = (state: SenhorasState) => save(SENHORAS_KEY, state)
