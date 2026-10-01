import type { AppState } from '../types'
import { getMonthBlocks } from '../lib/schedule'
import { ClassCard } from './ClassCard'
import { Shareable } from './Shareable'

interface Props {
  state: AppState
  onOverride: (key: string, name: string | null) => void
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function SchedulePreview({ state, onOverride }: Props) {
  const { config, overrides } = state
  const classes = state.classes.filter((c) => c.enabled)
  const blocks = getMonthBlocks(config.startMonth, config.months, config.weekday)

  if (classes.length === 0) {
    return <p className="hint">Ative pelo menos uma classe para ver a escala.</p>
  }

  return (
    <section>
      <h2 className="preview-title">Escala</h2>
      <p className="hint">Dica: clique num nome para trocar manualmente a pessoa daquele dia.</p>

      <div className="cards">
        {classes.map((group) => (
          <Shareable
            key={group.id}
            fileName={`escala-${slug(group.name)}.png`}
            version={JSON.stringify([group, config, overrides])}
            render={(exporting) => (
              <ClassCard
                group={group}
                blocks={blocks}
                overrides={overrides}
                onOverride={onOverride}
                exporting={exporting}
              />
            )}
          />
        ))}
      </div>
    </section>
  )
}
