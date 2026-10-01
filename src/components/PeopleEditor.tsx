import { useState } from 'react'
import { formatNames } from '../lib/names'

interface Props {
  people: string[]
  onChange: (people: string[]) => void
  emptyText?: string
}

/** Lista ordenada de nomes: adicionar, remover e reordenar. */
export function PeopleEditor({ people, onChange, emptyText = 'Nenhum nome ainda' }: Props) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const names = formatNames(draft.split(','))
    if (names.length) onChange([...people, ...names])
    setDraft('')
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= people.length) return
    const next = [...people]
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
    onChange(next)
  }

  return (
    <>
      <ol className="people">
        {people.map((p, i) => (
          <li key={`${p}-${i}`}>
            <span className="pos">{i + 1}</span>
            <span className="pname">{p}</span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">
              ↑
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === people.length - 1} aria-label="Descer">
              ↓
            </button>
            <button
              type="button"
              className="remove"
              onClick={() => onChange(people.filter((_, k) => k !== i))}
              aria-label="Remover"
            >
              ✕
            </button>
          </li>
        ))}
        {people.length === 0 && <li className="empty">{emptyText}</li>}
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
    </>
  )
}
