import { describe, expect, it } from 'vitest'
import { formatName } from './names'

describe('formatName: nomes com a primeira letra maiúscula', () => {
  it('maiúsculas ou minúsculas viram "Maria"', () => {
    expect(formatName('MARIA')).toBe('Maria')
    expect(formatName('maria')).toBe('Maria')
    expect(formatName('mARIA eDNA')).toBe('Maria Edna')
  })

  it('acentos e cedilha', () => {
    expect(formatName('JOÃO LUCAS')).toBe('João Lucas')
    expect(formatName('ângela')).toBe('Ângela')
    expect(formatName('ELIZÂNGELA DA CONCEIÇÃO')).toBe('Elizângela da Conceição')
  })

  it('"de", "da", "do", "dos", "das" e "e" ficam minúsculos no meio do nome', () => {
    expect(formatName('joão DA silva')).toBe('João da Silva')
    expect(formatName('MARIA DOS SANTOS E SOUZA')).toBe('Maria dos Santos e Souza')
    expect(formatName('ana DE oliveira')).toBe('Ana de Oliveira')
  })

  it('no começo do nome, mesmo essas palavras ficam maiúsculas', () => {
    expect(formatName('da silva')).toBe('Da Silva')
  })

  it('hífen e apóstrofo', () => {
    expect(formatName('ana-clara')).toBe('Ana-Clara')
    expect(formatName("joana d'ávila")).toBe("Joana D'Ávila")
  })

  it('abreviações como Mª continuam certas', () => {
    expect(formatName('Mª ROSA')).toBe('Mª Rosa')
    expect(formatName('mª eunice')).toBe('Mª Eunice')
  })

  it('tira espaços sobrando', () => {
    expect(formatName('  maria   edna  ')).toBe('Maria Edna')
    expect(formatName('   ')).toBe('')
  })
})
