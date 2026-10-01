import { useEffect, useRef, useState } from 'react'
import type { jsPDF as JsPDF } from 'jspdf'
import { downloadBlob, shareFile } from '../../lib/exportImage'
import type { Entry, Period } from '../../lib/oracao'
import { buildOracaoPdf } from '../../lib/oracaoPdf'

const FILE_NAME = 'oracao-ininterrupta.pdf'

/**
 * Botões do PDF da lista completa. A biblioteca é carregada antes do toque, para o PDF ser montado
 * e compartilhado na hora (o iPhone só deixa compartilhar logo após o toque).
 */
export function PdfActions({ period, entries }: { period: Period; entries: Entry[] }) {
  const lib = useRef<typeof JsPDF | null>(null)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    import('jspdf').then((m) => {
      lib.current = m.jsPDF
      setReady(true)
    })
  }, [])

  const build = () => buildOracaoPdf(lib.current!, period, entries)

  const share = async () => {
    setMessage(null)
    const result = await shareFile(build(), FILE_NAME)
    if (result === 'downloaded') setMessage('Seu navegador não permite compartilhar; o PDF foi baixado.')
    if (result === 'retry') setMessage('Toque em Compartilhar PDF de novo.')
  }

  return (
    <div className="pdf-actions">
      <p className="hint">
        Para a lista completa, o <b>PDF</b> fica mais nítido que a imagem: o WhatsApp envia como documento, sem
        reduzir a qualidade.
      </p>
      <div className="actions">
        <button className="share" disabled={!ready} onClick={share}>
          📄 Compartilhar PDF
        </button>
        <button className="link" disabled={!ready} onClick={() => downloadBlob(build(), FILE_NAME)}>
          baixar PDF
        </button>
      </div>
      {message && <p className="share-msg">{message}</p>}
    </div>
  )
}
