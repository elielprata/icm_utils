import { useState, type CSSProperties } from 'react'
import type { ClassGroup } from '../types'

interface Props {
  group: ClassGroup
  onChange: (group: ClassGroup) => void
}

export function ClassEditor({ group, onChange }: Props) {
  const [draft, setDraft] = useState('')
  const set = (patch: Partial<ClassGroup>) => onChange({ ...group, ...patch })

  const add = () => {
    const names = draft
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
    if (names.length) set({ people: [...group.people, ...names] })
    setDraft('')
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= group.people.length) return
    const people = [...group.people]
    const tmp = people[i]
    people[i] = people[j]
    people[j] = tmp
    set({ people })
  }

  return (
    <div
      className={`class-card ${group.enabled ? '' : 'disabled'}`}
      style={{ '--accent': group.color } as CSSProperties}
    >
      <header>
        <span className="emoji">{group.emoji}</span>
        <input className="class-name" value={group.name} onChange={(e) => set({ name: e.target.value })} />
        <label className="toggle" title="Incluir na escala">
          <input type="checkbox" checked={group.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          <span>{group.enabled ? 'Ativa' : 'Inativa'}</span>
        </label>
      </header>

      <ol className="people">
        {group.people.map((p, i) => (
          <li key={`${p}-${i}`}>
            <span className="pos">{i + 1}</span>
            <span className="pname">{p}</span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === group.people.length - 1}
              aria-label="Descer"
            >
              ↓
            </button>
            <button
              type="button"
              className="remove"
              onClick={() => set({ people: group.people.filter((_, k) => k !== i) })}
              aria-label="Remover"
            >
              ✕
            </button>
          </li>
        ))}
        {group.people.length === 0 && <li className="empty">Nenhum responsável ainda</li>}
      </ol>

      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input
          placeholder="Nome (ou vários separados por vírgula)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit">Adicionar</button>
      </form>
    </div>
  )
}
