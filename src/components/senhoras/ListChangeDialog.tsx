import { useState } from 'react'
import { WednesdayPicker } from './WednesdayPicker'

interface Props {
  from: number
  to: number
  /** Quarta sugerida (YYYY-MM-DD) para começar a nova tabela */
  suggested: string
  onRestart: (anchor: string) => void
  onKeep: () => void
}

/** Pergunta a partir de quando vale a nova tabela quando muda a quantidade de servas. */
export function ListChangeDialog({ from, to, suggested, onRestart, onKeep }: Props) {
  const [date, setDate] = useState(suggested)

  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-labelledby="list-change-title">
      <div className="modal">
        <h3 id="list-change-title">A lista agora tem {to} servas</h3>
        <p>
          A tabela muda de {from} para {to} servas. A partir de qual quarta a nova tabela começa, no 1º rodízio?
        </p>
        <WednesdayPicker id="list-change-date" label="Começar na quarta" value={date} onChange={setDate} />
        <div className="modal-buttons">
          <button className="ghost" onClick={onKeep}>
            Manter a contagem atual
          </button>
          <button className="primary" onClick={() => onRestart(date)}>
            Recomeçar nesta data
          </button>
        </div>
      </div>
    </div>
  )
}
