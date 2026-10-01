import { Shareable } from '../Shareable'
import { buildOracaoPdf } from '../../lib/oracaoPdf'
import { formatRange, hasMotivos, type Entry, type Period } from '../../lib/oracao'
import { MotivosImageShare } from './MotivosImage'
import { MotivosList } from './MotivosList'
import { OracaoSheet } from './OracaoSheet'
import { PdfActions } from './PdfActions'

/** Lista de horários: PDF (mais nítido) e imagem. */
export function ShareList({ period, entries }: { period: Period; entries: Entry[] }) {
  return (
    <div className="cards">
      <PdfActions
        what="da lista"
        fileName="oracao-ininterrupta.pdf"
        build={(jsPDF) => buildOracaoPdf(jsPDF, period, entries)}
        hint="O PDF fica mais nítido que a imagem: o WhatsApp envia como documento, sem reduzir a qualidade."
      />
      <Shareable
        fileName="oracao-ininterrupta.png"
        version={JSON.stringify([period, entries])}
        render={(exporting) => <OracaoSheet period={period} entries={entries} exporting={exporting} />}
      />
    </div>
  )
}

/** Cartão com os motivos em texto (é o que vira imagem). */
export function MotivosCard({
  period,
  exporting,
}: {
  period: Pick<Period, 'motivo' | 'motivos' | 'start' | 'end'>
  exporting?: boolean
}) {
  return (
    <div className={`motivos-sheet${exporting ? ' export' : ''}`}>
      {period.motivo && <div className="os-kicker">{period.motivo}</div>}
      <h3>Motivos de Oração</h3>
      <div className="os-period">{formatRange(period)}</div>
      <MotivosList text={period.motivos} />
    </div>
  )
}

/**
 * Motivos de oração, compartilhados à parte da lista e só como imagem: a arte enviada pelo coordenador
 * substitui o texto; sem arte, os motivos em texto viram imagem.
 */
export function ShareMotivos({ period, image }: { period: Period; image?: string | null }) {
  if (image) {
    return (
      <div className="cards">
        <MotivosImageShare image={image} />
      </div>
    )
  }
  if (!hasMotivos(period.motivos)) return null
  return (
    <div className="cards">
      <Shareable
        fileName="motivos-de-oracao.png"
        version={JSON.stringify([period.motivo, period.motivos, period.start, period.end])}
        render={(exporting) => <MotivosCard period={period} exporting={exporting} />}
      />
    </div>
  )
}
