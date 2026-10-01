import { useEffect, useState } from 'react'
import { downloadBlob, shareImage } from '../../lib/exportImage'
import {
  compressImage,
  dataUrlToBlob,
  imageExtension,
  removeMotivosImage,
  saveMotivosImage,
  watchMotivosImage,
} from '../../lib/motivosImage'

/** Imagem dos motivos do período, ao vivo (`undefined` enquanto carrega). */
export function useMotivosImage(periodId: string) {
  const [image, setImage] = useState<string | null | undefined>(undefined)
  useEffect(() => watchMotivosImage(periodId, setImage), [periodId])
  return image
}

/** Coordenador: escolher, trocar ou remover a imagem dos motivos. */
export function MotivosImageField({ periodId, image }: { periodId: string; image: string | null | undefined }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const choose = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      await saveMotivosImage(periodId, await compressImage(file))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      <h2>Imagem dos motivos (opcional)</h2>
      <p className="hint">
        Se a igreja mandou os motivos numa arte, envie aqui. Com imagem, ela aparece <b>no lugar do texto</b> na aba
        Motivos de quem se inscreve e é o que se compartilha. A imagem é reduzida no seu aparelho antes de enviar.
      </p>
      {image && <ZoomableImage src={image} alt="Imagem dos motivos de oração" />}
      <div className="image-buttons">
        <label className={`file-button${busy ? ' disabled' : ''}`}>
          {busy ? 'Enviando…' : image ? 'Trocar imagem' : 'Escolher imagem'}
          <input
            id="motivos-image"
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => {
              choose(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
        {image && (
          <button
            className="ghost danger"
            disabled={busy}
            onClick={() => confirm('Remover a imagem dos motivos?') && removeMotivosImage(periodId).catch((e: Error) => setError(e.message))}
          >
            Remover
          </button>
        )}
      </div>
      {error && <p className="status warn">{error}</p>}
    </section>
  )
}

/** A imagem dos motivos com os botões de compartilhar e baixar. */
export function MotivosImageShare({ image }: { image: string }) {
  const [message, setMessage] = useState<string | null>(null)
  const fileName = `motivos-de-oracao.${imageExtension(image)}`

  const share = async () => {
    setMessage(null)
    const result = await shareImage(dataUrlToBlob(image), fileName)
    if (result === 'copied') setMessage('Imagem copiada! É só colar (Ctrl+V) na conversa do WhatsApp.')
    if (result === 'downloaded') setMessage('Seu navegador não permite compartilhar; a imagem foi baixada.')
    if (result === 'retry') setMessage('Toque em Compartilhar de novo.')
  }

  return (
    <div className="card-wrap">
      <ZoomableImage src={image} alt="Motivos de oração" />
      <div className="actions">
        <button className="share" onClick={share}>
          📤 Compartilhar imagem
        </button>
        <button className="link" onClick={() => downloadBlob(dataUrlToBlob(image), fileName)}>
          baixar
        </button>
      </div>
      {message && <p className="share-msg">{message}</p>}
    </div>
  )
}

/** Imagem que abre em tela cheia, no tamanho original, ao tocar (dá para ampliar com os dedos). */
function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button type="button" className="zoom-trigger" onClick={() => setOpen(true)} aria-label="Ampliar a imagem">
        <img className="motivos-image" src={src} alt={alt} />
        <span className="zoom-hint">🔍 Toque para ampliar</span>
      </button>
      {open && (
        <div className="zoom-view" role="dialog" aria-modal="true" aria-label={alt}>
          <button type="button" className="zoom-close" onClick={() => setOpen(false)}>
            ✕ Fechar
          </button>
          <img src={src} alt={alt} />
        </div>
      )}
    </>
  )
}
