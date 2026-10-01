import { toPng } from 'html-to-image'

/** Largura fixa da imagem, para sair igual no celular e no computador. */
const EXPORT_WIDTH = 720

export async function downloadPng(node: HTMLElement, fileName: string) {
  node.classList.add('exporting')
  try {
    await document.fonts.ready
    const dataUrl = await toPng(node, {
      width: EXPORT_WIDTH,
      height: node.offsetHeight,
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#fff8ef',
      // O cartão é centralizado com margin auto; na imagem a margem empurraria o conteúdo.
      style: { margin: '0', borderRadius: '0', boxShadow: 'none' },
      // Não exporta elementos marcados como "só na tela"
      filter: (el) => !(el instanceof HTMLElement && el.dataset.noExport !== undefined),
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = fileName
    a.click()
  } finally {
    node.classList.remove('exporting')
  }
}
