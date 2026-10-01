import { useRef, useState } from 'react'
import type { AppState } from '../types'
import { getMonthBlocks } from '../lib/schedule'
import { downloadPng } from '../lib/exportImage'
import { ClassCard } from './ClassCard'

interface Props {
  state: AppState
  onOverride: (key: string, name: string | null) => void
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function SchedulePreview({ state, onOverride }: Props) {
  const { config, overrides } = state
  const classes = state.classes.filter((c) => c.enabled)
  const blocks = getMonthBlocks(config.startMonth, config.months, config.weekday)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [busy, setBusy] = useState(false)

  const exportNode = async (node: HTMLElement | null, fileName: string) => {
    if (!node) return
    setBusy(true)
    try {
      await downloadPng(node, fileName)
    } catch (err) {
      alert('Não foi possível gerar a imagem: ' + String(err))
    } finally {
      setBusy(false)
    }
  }

  if (classes.length === 0) {
    return <p className="hint">Ative pelo menos uma classe para ver a escala.</p>
  }

  return (
    <section>
      <h2 className="preview-title">Escala</h2>
      <p className="hint">Dica: clique num nome para trocar manualmente a pessoa daquele dia.</p>

      <div className="cards">
        {classes.map((group) => (
          <div key={group.id} className="card-wrap">
            <ClassCard
              ref={(el) => {
                cardRefs.current[group.id] = el
              }}
              group={group}
              blocks={blocks}
              overrides={overrides}
              onOverride={onOverride}
            />
            <button
              className="download"
              disabled={busy}
              onClick={() => exportNode(cardRefs.current[group.id], `escala-${slug(group.name)}.png`)}
            >
              ⬇ Baixar imagem de {group.name}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
