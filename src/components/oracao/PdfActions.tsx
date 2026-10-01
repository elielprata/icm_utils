import { useEffect, useRef, useState } from 'react'
import type { jsPDF as JsPDF } from 'jspdf'
import { downloadBlob, shareFile } from '../../lib/exportImage'

interface Props {
  /** Ex.: "lista" → "Compartilhar PDF da lista" */
  what: string
  fileName: string
  build: (jsPDF: typeof JsPDF) => Blob
  hint?: string
}

/**
 * Botões de um PDF. A biblioteca é carregada antes do toque, para o PDF ser montado e compartilhado
 * na hora (o iPhone só deixa compartilhar logo após o toque).
 */
export function PdfActions({ what, fileName, build, hint }: Props) {
  const lib = useRef<typeof JsPDF | null>(null)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    import('jspdf').then((m) => {
      lib.current = m.jsPDF
      setReady(true)
    })
  }, [])

  const share = async () => {
    setMessage(null)
    const result = await shareFile(build(lib.current!), fileName)
    if (result === 'downloaded') setMessage('Seu navegador não permite compartilhar; o PDF foi baixado.')
    if (result === 'retry') setMessage('Toque em Compartilhar de novo.')
  }

  return (
    <div className="pdf-actions">
      {hint && <p className="hint">{hint}</p>}
      <div className="actions">
        <button className="share" disabled={!ready} onClick={share}>
          📄 Compartilhar PDF {what}
        </button>
        <button className="link" disabled={!ready} onClick={() => downloadBlob(build(lib.current!), fileName)}>
          baixar PDF
        </button>
      </div>
      {message && <p className="share-msg">{message}</p>}
    </div>
  )
}
