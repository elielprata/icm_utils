import type { CSSProperties } from 'react'
import type { ClassGroup } from '../types'
import { turmaWhen, visibleTurmas, type CiasEvento } from '../lib/ciasEvento'
// Arte do evento atual, a mesma para todo mundo. Para o próximo evento, troque este arquivo.
import eventArt from '../assets/evento-cias.webp'

interface Props {
  evento: CiasEvento
  classes: ClassGroup[]
  /** Versão usada para gerar a imagem: largura fixa. */
  exporting?: boolean
}

/** Imagem do evento: a arte, o nome, a igreja, o tema e as turmas marcadas (dia, horário, Palavra e Louvor). */
export function EventCard({ evento, classes, exporting }: Props) {
  return (
    <div className={`event-sheet${exporting ? ' export' : ''}`}>
      <div className="ev-banner">
        <img className="ev-banner-bg" src={eventArt} alt="" />
      </div>
      <div className="ev-head">
        {evento.name && <div className="ev-name">{evento.name}</div>}
        {evento.church && <div className="ev-church">{evento.church}</div>}
        {evento.tema && <div className="ev-tema">“{evento.tema}”</div>}
      </div>
      <div className="ev-turmas">
        {visibleTurmas(classes, evento.turmas).map((c) => {
          const t = evento.turmas[c.id]
          return (
            <div key={c.id} className="ev-turma" style={{ '--accent': c.color } as CSSProperties}>
              <div className="ev-turma-head">
                <b>
                  {c.emoji} {c.name}
                </b>
                <span>{turmaWhen(t)}</span>
              </div>
              <div className="ev-role">
                <span>Palavra</span>
                {t.palavra || '—'}
              </div>
              <div className="ev-role">
                <span>Louvor</span>
                {t.louvor || '—'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
