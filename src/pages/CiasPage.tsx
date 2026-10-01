import { useEffect, useState } from 'react'

import type { AppState } from '../types'
import { defaultState, loadState, saveState } from '../lib/storage'
import { PageHeader } from '../components/PageHeader'
import { PageTabs } from '../components/PageTabs'
import { ConfigPanel } from '../components/ConfigPanel'
import { ClassEditor } from '../components/ClassEditor'
import { SchedulePreview } from '../components/SchedulePreview'

export function CiasPage() {
  const [state, setState] = useState<AppState>(loadState)
  const [classId, setClassId] = useState(() => state.classes[0]?.id ?? '')

  useEffect(() => saveState(state), [state])

  const setOverride = (key: string, name: string | null) =>
    setState((s) => {
      const overrides = { ...s.overrides }
      if (name) overrides[key] = name
      else delete overrides[key]
      return { ...s, overrides }
    })

  const group = state.classes.find((c) => c.id === classId) ?? state.classes[0]

  return (
    <div className="app">
      <PageHeader title="🧒 Escala das CIAs" onReset={() => setState(defaultState())} />

      <ConfigPanel config={state.config} onChange={(config) => setState((s) => ({ ...s, config }))} />

      {/* Uma aba por classe: cada uma mostra só as suas professoras e a sua escala */}
      <div className="class-tabs">
        <PageTabs
          tabs={state.classes.map((c) => ({ id: c.id, label: `${c.emoji} ${c.name}`, color: c.color }))}
          value={group?.id ?? ''}
          onChange={setClassId}
        />
      </div>

      {group && (
        <>
          <section className="panel">
            <h2>Professoras</h2>
            <p className="hint">A ordem da lista define o rodízio: 1º, 2º, 3º… e volta ao 1º.</p>
            <ClassEditor
              group={group}
              onChange={(changed) =>
                setState((s) => ({ ...s, classes: s.classes.map((c) => (c.id === changed.id ? changed : c)) }))
              }
            />
          </section>

          <SchedulePreview group={group} config={state.config} overrides={state.overrides} onOverride={setOverride} />
        </>
      )}
    </div>
  )
}
