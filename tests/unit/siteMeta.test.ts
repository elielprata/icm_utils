// Ícone do site e prévia do link (WhatsApp etc.): genéricos, valem para todas as utilidades.
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const html = readFileSync('index.html', 'utf8')
const meta = (property: string) =>
  new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]+content="([^"]+)"`).exec(html)?.[1]

/** Largura e altura de um PNG (cabeçalho IHDR). */
const pngSize = (path: string) => {
  const buf = readFileSync(path)
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

describe('ícone do site', () => {
  it('é o ícone genérico, não o das CIAs', () => {
    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg"')
    const icons = html.match(/<link rel="(?:icon|apple-touch-icon)"[^>]*>/g) ?? []
    expect(icons).toHaveLength(2)
    for (const link of icons) expect(link).not.toMatch(/cias|\.webp/i)
    expect(existsSync('public/favicon.svg')).toBe(true)
  })

  it('não usa o símbolo da cruz', () => {
    expect(readFileSync('public/favicon.svg', 'utf8')).not.toMatch(/cruz/i)
  })

  it('tem a versão para a tela inicial do celular (180 × 180)', () => {
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png"')
    expect(pngSize('public/apple-touch-icon.png')).toEqual({ width: 180, height: 180 })
  })
})

describe('prévia do link', () => {
  it('título e descrição de todas as utilidades', () => {
    expect(meta('og:title')).toBe('Organização e Escalas')
    expect(meta('og:description')).toMatch(/CIAs.*Senhoras.*Oração/)
    expect(meta('description')).toBe(meta('og:description'))
  })

  it('imagem com endereço completo (o WhatsApp exige) e no tamanho padrão 1200 × 630', () => {
    expect(meta('og:image')).toBe('https://elielprata.github.io/icm_utils/og-image.png')
    expect(pngSize('public/og-image.png')).toEqual({ width: 1200, height: 630 })
    expect(meta('twitter:card')).toBe('summary_large_image')
  })
})
