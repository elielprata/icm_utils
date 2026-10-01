import type { CSSProperties } from 'react'
import type { ClassGroup } from '../types'
import { turmaWhen, type CiasEvento } from '../lib/ciasEvento'
import ciasBanner from '../assets/fundo-area-kids-site.webp'
import ciasLogo from '../assets/logo-cias.webp'

interface Props {
  evento: CiasEvento
  classes: ClassGroup[]
  /** Versão usada para gerar a imagem: largura fixa. */
  exporting?: boolean
}

/** Imagem do evento: a arte, o nome, a igreja, o tema e todas as turmas (dia, horário, Palavra e Louvor). */
export function EventCard({ evento, classes, exporting }: Props) {
  return (
    <div className={`event-sheet${exporting ? ' export' : ''}`}>
      <div className="ev-banner">
        <img className="ev-banner-bg" src={evento.image ?? ciasBanner} alt="" />
        {!evento.image && <img className="ev-logo" src={ciasLogo} alt="CIAS" />}
      </div>
      <div className="ev-head">
        <div className="ev-name">{evento.name || 'Evento das CIAs'}</div>
        {evento.church && <div className="ev-church">{evento.church}</div>}
        {evento.tema && <div className="ev-tema">“{evento.tema}”</div>}
      </div>
      <div className="ev-turmas">
        {classes.map((c) => {
          const t = evento.turmas[c.id]
          if (!t) return null
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
