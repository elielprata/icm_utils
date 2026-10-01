import { useEffect, useState } from 'react'
import type { AppState } from './types'
import { defaultState, loadState, saveState } from './lib/storage'
import { ConfigPanel } from './components/ConfigPanel'
import { ClassEditor } from './components/ClassEditor'
import { SchedulePreview } from './components/SchedulePreview'

export default function App() {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => saveState(state), [state])

  const setOverride = (key: string, name: string | null) =>
    setState((s) => {
      const overrides = { ...s.overrides }
      if (name) overrides[key] = name
      else delete overrides[key]
      return { ...s, overrides }
    })

  return (
    <div className="app">
      <header className="app-header">
        <h1>📅 Escala de Professores</h1>
        <button
          className="ghost"
          onClick={() => confirm('Apagar todos os nomes e ajustes?') && setState(defaultState())}
        >
          Recomeçar
        </button>
      </header>

      <ConfigPanel config={state.config} onChange={(config) => setState((s) => ({ ...s, config }))} />

      <section className="panel">
        <h2>Classes e responsáveis</h2>
        <p className="hint">A ordem da lista define o rodízio: 1º, 2º, 3º… e volta ao 1º.</p>
        <div className="classes-grid">
          {state.classes.map((g) => (
            <ClassEditor
              key={g.id}
              group={g}
              onChange={(group) =>
                setState((s) => ({ ...s, classes: s.classes.map((c) => (c.id === group.id ? group : c)) }))
              }
            />
          ))}
        </div>
      </section>

      <SchedulePreview state={state} onOverride={setOverride} />
    </div>
  )
}
