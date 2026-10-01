import type { jsPDF as JsPDF } from 'jspdf'
import { bySlot, formatRange, slotLabel, SLOTS, type Entry, type Period } from './oracao'

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

const W = 210
const H = 297
const M = 10
const ROWS = SLOTS / 2
const FOOTER = 8
const COL_TITLE_H = 6

/** Cabeçalho comum: título curto do período, nome do documento e datas. */
function drawHeader(pdf: JsPDF, period: Period, title: string): number {
  let y = M + 4
  pdf.setFont('helvetica', 'bold')
  if (period.motivo) {
    pdf.setFontSize(8).setTextColor(MUTED)
    pdf.text(pdfText(period.motivo).toUpperCase(), W / 2, y, { align: 'center', charSpace: 0.4 })
    y += 7
  }
  pdf.setFontSize(20).setTextColor(WINE)
  pdf.text(title, W / 2, y, { align: 'center' })
  y += 6
  pdf.setFontSize(10).setTextColor(TEXT)
  pdf.text(formatRange(period), W / 2, y, { align: 'center' })
  return y + 7
}

/**
 * Lista de horários em PDF (A4 em pé, uma página): título, legenda e os 96 horários em duas colunas,
 * com os nomes na cor de cada igreja. O texto continua texto: fica nítido em qualquer zoom.
 * Os motivos de oração são compartilhados à parte, como imagem.
 */
export function buildOracaoPdf(jsPDF: JsPDFConstructor, period: Period, entries: Entry[]): Blob {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const slots = bySlot(entries)
  let y = drawHeader(pdf, period, 'Oração Ininterrupta')
  y = drawLegend(pdf, period, y)
  const rowH = Math.min(5.5, (H - M - FOOTER - y - COL_TITLE_H) / ROWS)
  const colGap = 5
  const colW = (W - 2 * M - colGap) / 2
  drawColumn(pdf, period, slots, 0, 'MADRUGADA E MANHÃ', M, y, colW, rowH)
  drawColumn(pdf, period, slots, ROWS, 'TARDE E NOITE', M + colW + colGap, y, colW, rowH)

  // Rodapé com o resumo
  const filled = slots.filter((s) => s.length > 0).length
  pdf.setFont('helvetica', 'bold').setFontSize(8).setTextColor(MUTED)
  pdf.text(`${filled} de ${SLOTS} horários preenchidos  ·  ${SLOTS - filled} vagos  ·  ${entries.length} pessoas`, W / 2, H - M + 2, {
    align: 'center',
  })

  return pdf.output('blob')
}

/** Legenda centralizada com a cor de cada igreja. */
function drawLegend(pdf: JsPDF, period: Period, y: number): number {
  const churches = Object.values(period.churches).sort((a, b) => a.order - b.order)
  pdf.setFont('helvetica', 'bold').setFontSize(8)
  const items = churches.map((c) => ({ c, label: pdfText(c.name), w: pdf.getTextWidth(pdfText(c.name)) + 6 }))
  let x = (W - items.reduce((sum, it) => sum + it.w + 4, -4)) / 2
  for (const it of items) {
    pdf.setFillColor(it.c.color).roundedRect(x, y - 2.6, 3, 3, 0.6, 0.6, 'F')
    pdf.setTextColor(TEXT).text(it.label, x + 4.2, y)
    x += it.w + 4
  }
  return y + 5
}

/** Uma coluna de 48 horários, com os nomes coloridos (a fonte diminui se não couber na linha). */
function drawColumn(
  pdf: JsPDF,
  period: Period,
  slots: Entry[][],
  from: number,
  title: string,
  left: number,
  top: number,
  colW: number,
  rowH: number,
) {
  const timeW = 22
  pdf.setFillColor(WINE).roundedRect(left, top, colW, COL_TITLE_H, 1.5, 1.5, 'F')
  pdf.rect(left, top + 3, colW, COL_TITLE_H - 3, 'F')
  pdf.setFont('helvetica', 'bold').setFontSize(8).setTextColor('#ffffff')
  pdf.text(title, left + colW / 2, top + 4.1, { align: 'center', charSpace: 0.3 })

  let ry = top + COL_TITLE_H
  for (let i = 0; i < ROWS; i++) {
    const slot = from + i
    const people = slots[slot]
    if (people.length === 0) pdf.setFillColor(EMPTY).rect(left + timeW, ry, colW - timeW, rowH, 'F')
    pdf.setFillColor(STRIPE).rect(left, ry, timeW, rowH, 'F')
    pdf.setDrawColor('#ece4e0').setLineWidth(0.15).line(left, ry + rowH, left + colW, ry + rowH)
    const baseline = ry + rowH / 2 + 1.1
    pdf.setFont('helvetica', 'bold').setFontSize(7.2).setTextColor(TEXT)
    pdf.text(pdfText(slotLabel(slot)), left + 1.8, baseline)

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
  pdf.setDrawColor('#e3d9d5').setLineWidth(0.25).rect(left, top + COL_TITLE_H, colW, rowH * ROWS)
}
