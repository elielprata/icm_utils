import type { jsPDF as JsPDF } from 'jspdf'
import { bySlot, formatRange, motivoLines, slotLabel, SLOTS, type Entry, type Period } from './oracao'

type JsPDFConstructor = typeof JsPDF

/**
 * As fontes padrão do PDF só têm o alfabeto latino (com acentos). Troca travessões e aspas tipográficas
 * e tira o que não dá para desenhar (emojis, bandeiras).
 */
export function pdfText(text: string): string {
  return text
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/[^\u0000-ÿ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const WINE = '#8a1c24'
const MUTED = '#7a7176'
const TEXT = '#2b2a33'
const STRIPE = '#faf6f4'
const EMPTY = '#fbf3e4'

/**
 * Lista completa em PDF (A4 em pé): título, motivos, legenda e os 96 horários em duas colunas,
 * com os nomes na cor de cada igreja. O texto continua texto: fica nítido em qualquer zoom.
 */
export function buildOracaoPdf(jsPDF: JsPDFConstructor, period: Period, entries: Entry[]): Blob {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297
  const M = 10
  const slots = bySlot(entries)
  const churches = Object.entries(period.churches).sort((a, b) => a[1].order - b[1].order)
  let y = M + 4

  // Cabeçalho
  pdf.setFont('helvetica', 'bold')
  if (period.motivo) {
    pdf.setFontSize(8).setTextColor(MUTED)
    pdf.text(pdfText(period.motivo).toUpperCase(), W / 2, y, { align: 'center', charSpace: 0.4 })
    y += 7
  }
  pdf.setFontSize(20).setTextColor(WINE)
  pdf.text('Oração Ininterrupta', W / 2, y, { align: 'center' })
  y += 6
  pdf.setFontSize(10).setTextColor(TEXT)
  pdf.text(formatRange(period), W / 2, y, { align: 'center' })
  y += 5

  // Motivos de oração
  const motivos = motivoLines(period.motivos).map(pdfText).filter(Boolean)
  if (motivos.length) {
    pdf.setFontSize(8.5)
    const lines = motivos.flatMap((m) => (pdf.splitTextToSize(`•  ${m}`, W - 2 * M - 12) as string[]))
    const boxH = 7 + lines.length * 3.8 + 2
    pdf.setFillColor('#f8e9ea').roundedRect(M, y, W - 2 * M, boxH, 2, 2, 'F')
    pdf.setFillColor(WINE).rect(M, y, 1.2, boxH, 'F')
    pdf.setFont('helvetica', 'bold').setFontSize(7).setTextColor(WINE)
    pdf.text('MOTIVOS DE ORAÇÃO', M + 5, y + 5, { charSpace: 0.3 })
    pdf.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(TEXT)
    lines.forEach((line, i) => pdf.text(line, M + 5, y + 9.5 + i * 3.8))
    y += boxH + 4
  }

  // Legenda
  pdf.setFont('helvetica', 'bold').setFontSize(8)
  const items = churches.map(([, c]) => ({ c, label: pdfText(c.name), w: pdf.getTextWidth(pdfText(c.name)) + 6 }))
  let x = (W - items.reduce((sum, it) => sum + it.w + 4, -4)) / 2
  for (const it of items) {
    pdf.setFillColor(it.c.color).roundedRect(x, y - 2.6, 3, 3, 0.6, 0.6, 'F')
    pdf.setTextColor(TEXT).text(it.label, x + 4.2, y)
    x += it.w + 4
  }
  y += 5

  // Horários: duas colunas de 48 linhas numa página; se o cabeçalho for grande, uma coluna por página
  const rows = SLOTS / 2
  const footer = 8
  const titleH = 6
  let rowH = (H - M - footer - y - titleH) / rows
  const twoPages = rowH < 3.6
  if (twoPages) rowH = Math.min(5.2, (H - 2 * M - footer - titleH) / rows)
  const colGap = 5
  const colW = twoPages ? W - 2 * M : (W - 2 * M - colGap) / 2
  const timeW = 22

  const drawColumn = (from: number, title: string, left: number, top: number) => {
    pdf.setFillColor(WINE).roundedRect(left, top, colW, titleH, 1.5, 1.5, 'F')
    pdf.rect(left, top + 3, colW, titleH - 3, 'F')
    pdf.setFont('helvetica', 'bold').setFontSize(8).setTextColor('#ffffff')
    pdf.text(title, left + colW / 2, top + 4.1, { align: 'center', charSpace: 0.3 })
    let ry = top + titleH
    for (let i = 0; i < rows; i++) {
      const slot = from + i
      const people = slots[slot]
      if (people.length === 0) pdf.setFillColor(EMPTY).rect(left + timeW, ry, colW - timeW, rowH, 'F')
      pdf.setFillColor(STRIPE).rect(left, ry, timeW, rowH, 'F')
      pdf.setDrawColor('#ece4e0').setLineWidth(0.15).line(left, ry + rowH, left + colW, ry + rowH)
      const baseline = ry + rowH / 2 + 1.1
      pdf.setFont('helvetica', 'bold').setFontSize(7.2).setTextColor(TEXT)
      pdf.text(pdfText(slotLabel(slot)), left + 1.8, baseline)

      // Nomes coloridos, separados por " / "; a fonte diminui se não couber na linha
      const parts = people.map((p) => ({ text: pdfText(p.name), color: period.churches[p.church]?.color ?? TEXT }))
      const available = colW - timeW - 3
      let size = 7.6
      const width = () => {
        pdf.setFontSize(size)
        return parts.reduce((sum, p, k) => sum + pdf.getTextWidth(p.text) + (k ? pdf.getTextWidth(' / ') : 0), 0)
      }
      while (size > 4.6 && width() > available) size -= 0.2
      let nx = left + timeW + 1.8
      parts.forEach((p, k) => {
        if (k) {
          pdf.setTextColor(MUTED).text(' / ', nx, baseline)
          nx += pdf.getTextWidth(' / ')
        }
        pdf.setTextColor(p.color).text(p.text, nx, baseline)
        nx += pdf.getTextWidth(p.text)
      })
      ry += rowH
    }
    pdf.setDrawColor('#e3d9d5').setLineWidth(0.25).rect(left, top + titleH, colW, rowH * rows)
  }

  if (twoPages) {
    drawColumn(0, 'MADRUGADA E MANHÃ', M, y)
    pdf.addPage()
    drawColumn(rows, 'TARDE E NOITE', M, M)
  } else {
    drawColumn(0, 'MADRUGADA E MANHÃ', M, y)
    drawColumn(rows, 'TARDE E NOITE', M + colW + colGap, y)
  }

  // Rodapé com o resumo
  const filled = slots.filter((s) => s.length > 0).length
  pdf.setFont('helvetica', 'bold').setFontSize(8).setTextColor(MUTED)
  pdf.text(`${filled} de ${SLOTS} horários preenchidos  ·  ${SLOTS - filled} vagos  ·  ${entries.length} pessoas`, W / 2, H - M + 2, {
    align: 'center',
  })

  return pdf.output('blob')
}
