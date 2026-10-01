import { useEffect, useRef, useState, type ReactNode } from 'react'
import { downloadBlob, renderPng, shareImage, type ShareResult } from '../lib/exportImage'

interface Props {
  fileName: string
  /** Muda quando o conteúdo muda, para gerar a imagem de novo. */
  version: string
  /** Renderiza o cartão; `exporting` = cópia de largura fixa usada na imagem. */
  render: (exporting: boolean) => ReactNode
}

const MESSAGES: Partial<Record<ShareResult, string>> = {
  copied: 'Imagem copiada! É só colar (Ctrl+V) na conversa do WhatsApp.',
  downloaded: 'Seu navegador não permite compartilhar; a imagem foi baixada.',
  retry: 'Imagem pronta! Toque em Compartilhar de novo.',
}

/** Cartão + botões de compartilhar/baixar a imagem dele. */
export function Shareable({ fileName, version, render }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const image = useRef<Blob | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const node = () => stageRef.current?.firstElementChild as HTMLElement

  // Gera a imagem com antecedência: o compartilhamento precisa acontecer logo após o toque.
  useEffect(() => {
    let cancelled = false
    image.current = null
    setReady(false)
    const timer = setTimeout(async () => {
      try {
        const blob = await renderPng(node())
        if (cancelled) return
        image.current = blob
        setReady(true)
      } catch {
        /* gera na hora do clique */
      }
    }, 600)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [version])

  const getImage = async () => {
    if (!image.current) {
      image.current = await renderPng(node())
      setReady(true)
    }
    return image.current
  }

  const run = async (action: 'share' | 'download') => {
    setBusy(true)
    setMessage(null)
    try {
      const blob = await getImage()
      if (action === 'download') return downloadBlob(blob, fileName)
      setMessage(MESSAGES[await shareImage(blob, fileName)] ?? null)
    } catch (err) {
      setMessage('Não foi possível gerar a imagem: ' + String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card-wrap">
      {render(false)}
      <div className="actions">
        <button className="share" disabled={busy} onClick={() => run('share')}>
          {busy ? 'Gerando…' : ready ? '📤 Compartilhar' : '📤 Compartilhar…'}
        </button>
        <button className="link" disabled={busy} onClick={() => run('download')}>
          baixar
        </button>
      </div>
      {message && <p className="share-msg">{message}</p>}

      {/* Cópia com largura fixa, fora da tela, usada para gerar a imagem */}
      <div className="export-stage" aria-hidden ref={stageRef}>
        {render(true)}
      </div>
    </div>
  )
}
