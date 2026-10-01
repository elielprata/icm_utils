import { Shareable } from '../Shareable'
import { buildMotivosPdf, buildOracaoPdf } from '../../lib/oracaoPdf'
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

/**
 * Motivos de oração, compartilhados à parte da lista: a imagem enviada pelo coordenador (se houver)
 * e os motivos em texto, em PDF ou imagem.
 */
export function ShareMotivos({ period, image }: { period: Period; image?: string | null }) {
  return (
    <div className="cards">
      {image && <MotivosImageShare image={image} />}
      {hasMotivos(period.motivos) && (
        <>
          <PdfActions
            what="dos motivos"
            fileName="motivos-de-oracao.pdf"
            build={(jsPDF) => buildMotivosPdf(jsPDF, period)}
          />
          <Shareable
            fileName="motivos-de-oracao.png"
            version={JSON.stringify([period.motivo, period.motivos, period.start, period.end])}
            render={(exporting) => (
              <div className={`motivos-sheet${exporting ? ' export' : ''}`}>
                {period.motivo && <div className="os-kicker">{period.motivo}</div>}
                <h3>Motivos de Oração</h3>
                <div className="os-period">{formatRange(period)}</div>
                <MotivosList text={period.motivos} />
              </div>
            )}
          />
        </>
      )}
    </div>
  )
}
