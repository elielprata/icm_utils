import { describe, expect, it, vi } from 'vitest'
import { jsPDF } from 'jspdf'

vi.mock('./firebase', () => ({ db: {} }))

const { buildOracaoPdf, pdfText } = await import('./oracaoPdf')
const { entryId } = await import('./oracao')

const period = {
  id: 'p1',
  motivo: 'Ministérios',
  motivos: 'MOTIVOS PESSOAIS\n• Entrega ao Senhor 🇧🇷\nMOTIVOS GERAIS\n• Pelas autoridades',
  start: '2026-09-01',
  end: '2026-09-30',
  churches: {
    pio: { name: 'Pioneira', color: '#e8892b', order: 0 },
    caj: { name: 'Cajazeiras', color: '#1f1f1f', order: 1 },
  },
  admins: ['coord@gmail.com'],
}
const entry = (slot: number, level: number, name: string, church = 'pio') => ({ id: entryId(slot, level), slot, level, name, church })

const pdfSource = async (blob: Blob) => new TextDecoder('latin1').decode(await blob.arrayBuffer())
const pageCount = (src: string) => (src.match(/\/Type \/Page\b/g) ?? []).length

describe('pdfText', () => {
  it('troca travessões e tira emojis que a fonte do PDF não tem', () => {
    expect(pdfText('00:00 – 00:15')).toBe('00:00 - 00:15')
    expect(pdfText('Pela nossa Pátria 🇧🇷')).toBe('Pela nossa Pátria')
    expect(pdfText('“Senhor”…')).toBe('"Senhor"...')
  })
})

describe('buildOracaoPdf (lista de horários)', () => {
  it('uma página com título, igrejas e nomes, sem os motivos', async () => {
    const blob = buildOracaoPdf(jsPDF, period, [entry(0, 0, 'Penha', 'caj'), entry(0, 1, 'Eliel'), entry(95, 0, 'Mateus')])
    expect(blob.type).toBe('application/pdf')
    const src = await pdfSource(blob)
    expect(src.startsWith('%PDF')).toBe(true)
    expect(pageCount(src)).toBe(1)
    for (const text of ['Penha', 'Eliel', 'Mateus', 'Pioneira', 'Cajazeiras', '23:45 - 00:00']) {
      expect(src).toContain(text)
    }
    expect(src).not.toContain('MOTIVOS GERAIS')
  })

  it('horário com muita gente cabe na linha (a fonte diminui)', async () => {
    const many = ['Mara', 'Adeni', 'Antônia', 'Alcimary', 'Suzana', 'Iana Mara', 'Maria Edna'].map((n, i) => entry(88, i, n))
    const src = await pdfSource(buildOracaoPdf(jsPDF, period, many))
    expect(src).toContain('Maria Edna')
    expect(pageCount(src)).toBe(1)
  })

  it('motivos longos não afetam a lista: continua em uma página', async () => {
    const motivos = Array.from({ length: 40 }, (_, i) => `• Motivo número ${i + 1}`).join('\n')
    expect(pageCount(await pdfSource(buildOracaoPdf(jsPDF, { ...period, motivos }, [])))).toBe(1)
  })
})
