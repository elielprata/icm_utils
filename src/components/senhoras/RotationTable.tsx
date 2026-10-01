import { ROLES } from '../../lib/senhoras'

interface Props {
  table: number[][]
  people: string[]
  /** Semana do rodízio (1-based) da primeira quarta da escala, destacada */
  current: number
}

/** Tabela de rodízio semanal no formato do livro, com os nomes das servas. */
export function RotationTable({ table, people, current }: Props) {
  return (
    <div className="rotation-scroll">
      <table className="rotation">
        <thead>
          <tr>
            <th>Rodízio semanal</th>
            {table[0].map((_, k) => (
              <th key={k} className={k + 1 === current ? 'current' : ''}>
                {k + 1}º
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROLES.map((role, r) => (
            <tr key={role}>
              <th>{role}</th>
              {table[r].map((num, k) => (
                <td key={k} className={k + 1 === current ? 'current' : ''}>
                  <span className="num">{num}</span>
                  {people[num - 1]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
