import { describe, expect, it, vi } from 'vitest'

vi.mock('./firebase', () => ({ db: {} }))

const { dataUrlToBlob, fitWithin, imageExtension } = await import('./motivosImage')

describe('fitWithin', () => {
  it('reduz mantendo a proporção', () => {
    expect(fitWithin(2160, 3840)).toEqual({ width: 1080, height: 1920 })
    expect(fitWithin(4000, 3000)).toEqual({ width: 1080, height: 810 })
  })

  it('arte muito comprida respeita a altura máxima', () => {
    expect(fitWithin(1080, 4800)).toEqual({ width: 540, height: 2400 })
  })

  it('nunca aumenta uma imagem pequena', () => {
    expect(fitWithin(600, 800)).toEqual({ width: 600, height: 800 })
  })
})

describe('dataUrlToBlob', () => {
  it('converte o conteúdo e mantém o formato', async () => {
    const blob = dataUrlToBlob('data:image/webp;base64,' + btoa('RIFF1234WEBP'))
    expect(blob.type).toBe('image/webp')
    expect(await blob.text()).toBe('RIFF1234WEBP')
  })

  it('extensão do arquivo pelo formato', () => {
    expect(imageExtension('data:image/webp;base64,AAAA')).toBe('webp')
    expect(imageExtension('data:image/jpeg;base64,AAAA')).toBe('jpg')
    expect(imageExtension('data:image/png;base64,AAAA')).toBe('png')
  })
})
