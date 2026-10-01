import type { AppState } from '../types'
import { currentMonth } from './schedule'

const KEY = 'escala-professores:v1'

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
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<AppState>
      const base = defaultState()
      return {
        config: { ...base.config, ...saved.config },
        classes: saved.classes ?? base.classes,
        overrides: saved.overrides ?? {},
      }
    }
  } catch {
    /* ignora dados corrompidos */
  }
  return defaultState()
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* sem storage disponível */
  }
}
