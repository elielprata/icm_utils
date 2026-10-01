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
    <div className="class-card" style={{ '--accent': group.color } as CSSProperties}>
      <header>
        <span className="emoji">{group.emoji}</span>
        <input
          className="class-name"
          aria-label="Nome da classe"
          value={group.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </header>

      <PeopleEditor people={group.people} onChange={(people) => set({ people })} emptyText="Nenhuma professora ainda" />
    </div>
  )
}
