import type { CSSProperties } from 'react'
import type { ClassGroup } from '../types'
import { PeopleEditor } from './PeopleEditor'

interface Props {
  group: ClassGroup
  onChange: (group: ClassGroup) => void
}

export function ClassEditor({ group, onChange }: Props) {
  const set = (patch: Partial<ClassGroup>) => onChange({ ...group, ...patch })

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

      <PeopleEditor
        people={group.people}
        onChange={(people) => set({ people })}
        emptyText="Nenhum responsável ainda"
      />
    </div>
  )
}
