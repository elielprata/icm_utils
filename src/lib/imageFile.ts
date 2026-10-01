/**
 * Imagens enviadas pelo usuário (artes de eventos e motivos): reduzidas e comprimidas no próprio aparelho,
 * para caberem no Firestore (até 1 MiB por documento) ou no armazenamento do navegador.
 */
export const IMAGE_MAX_CHARS = 950_000
const MAX_WIDTH = 1080
const MAX_HEIGHT = 2400

/** Tamanho para caber em `maxW` × `maxH` sem distorcer (nunca aumenta). */
export function fitWithin(width: number, height: number, maxW = MAX_WIDTH, maxH = MAX_HEIGHT) {
  const scale = Math.min(1, maxW / width, maxH / height)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** "data:image/webp;base64,..." → Blob, sem esperar (o compartilhamento precisa ser logo após o toque). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const type = /data:([^;]+)/.exec(header)?.[1] ?? 'image/png'
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type })
}

export const imageExtension = (dataUrl: string) => (/data:image\/(\w+)/.exec(dataUrl)?.[1] ?? 'png').replace('jpeg', 'jpg')

/** Reduz e comprime a imagem escolhida até caber no limite (WebP; JPEG se o navegador não gerar WebP). */
export async function compressImage(file: File, maxChars = IMAGE_MAX_CHARS): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff' // imagens com transparência ficam com fundo branco
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const webp = canvas.toDataURL('image/webp', 0.9).startsWith('data:image/webp')
  const type = webp ? 'image/webp' : 'image/jpeg'
  for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5]) {
    const url = canvas.toDataURL(type, quality)
    if (url.length <= maxChars) return url
  }
  throw new Error('A imagem é grande demais. Tente uma imagem menor ou um print da tela.')
}
