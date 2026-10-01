import type { ReactNode } from 'react'
import type { Church, Entry } from '../../lib/oracao'

/** Pessoas de um horário, com a cor da igreja; `actions` adiciona botões por pessoa. */
export function PeopleList({
  people,
  churches,
  actions,
}: {
  people: Entry[]
  churches: Record<string, Church>
  actions?: (e: Entry) => ReactNode
}) {
  if (people.length === 0) return null
  return (
    <ul className="people-list">
      {people.map((e) => (
        <li key={e.id}>
          <i style={{ background: churches[e.church]?.color }} />
          <span className="pl-name">{e.name}</span>
          <span className="pl-church">{churches[e.church]?.name}</span>
          {actions?.(e)}
        </li>
      ))}
    </ul>
  )
}
