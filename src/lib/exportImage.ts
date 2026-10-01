import { toBlob } from 'html-to-image'

// O Safari às vezes gera a primeira imagem sem as figuras; renderizar duas vezes resolve.
const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent)

/** Gera o PNG de um cartão de exportação (renderizado fora da tela com largura fixa). */
export async function renderPng(node: HTMLElement): Promise<Blob> {
  await document.fonts.ready
  const options = {
    width: node.offsetWidth,
    height: node.offsetHeight,
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#fff8ef',
  }
  if (isSafari) await toBlob(node, options)
  const blob = await toBlob(node, options)
  if (!blob) throw new Error('Falha ao gerar a imagem')
  return blob
}

export type ShareResult = 'shared' | 'cancelled' | 'copied' | 'downloaded' | 'retry'

/**
 * Abre o compartilhamento nativo (celular → WhatsApp etc.).
 * Sem suporte: copia a imagem para colar no WhatsApp Web; em último caso, baixa o arquivo.
 */
export async function shareImage(blob: Blob, fileName: string): Promise<ShareResult> {
  const file = new File([blob], fileName, { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (err) {
      const name = (err as DOMException).name
      if (name === 'AbortError') return 'cancelled'
      // Gesto do usuário expirou enquanto a imagem era gerada: a próxima tentativa já usa a imagem pronta.
      if (name === 'NotAllowedError') return 'retry'
    }
  }

  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    return 'copied'
  } catch {
    downloadBlob(blob, fileName)
    return 'downloaded'
  }
}

/** Compartilha um arquivo qualquer (ex.: PDF); sem suporte ao compartilhamento, baixa o arquivo. */
export async function shareFile(blob: Blob, fileName: string): Promise<ShareResult> {
  const file = new File([blob], fileName, { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (err) {
      const name = (err as DOMException).name
      if (name === 'AbortError') return 'cancelled'
      if (name === 'NotAllowedError') return 'retry'
    }
  }
  downloadBlob(blob, fileName)
  return 'downloaded'
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
