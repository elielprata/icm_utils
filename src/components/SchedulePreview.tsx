import type { ClassGroup, Config, Overrides } from '../types'
import { getMonthBlocks } from '../lib/schedule'
import { ClassCard } from './ClassCard'
import { Shareable } from './Shareable'

interface Props {
  group: ClassGroup
  config: Config
  overrides: Overrides
  onOverride: (key: string, name: string | null) => void
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Escala de uma classe (os meses escolhidos), com os botões de compartilhar a imagem. */
export function SchedulePreview({ group, config, overrides, onOverride }: Props) {
  const blocks = getMonthBlocks(config.startMonth, config.months, config.weekday)
  const teachers = group.people.filter((p) => p.trim()).length

  return (
    <section>
      <h2 className="preview-title">Escala</h2>
      <p className="hint">Dica: clique num nome para trocar manualmente a pessoa daquele dia.</p>

      <div className="cards">
        <Shareable
          fileName={`escala-${slug(group.name)}.png`}
          version={JSON.stringify([group, config, overrides])}
          blocked={teachers === 0}
          warning={
            teachers === 0
              ? 'Cadastre pelo menos uma professora para compartilhar a escala.'
              : teachers === 1
                ? 'O ideal são pelo menos duas professoras, para revezar.'
                : undefined
          }
          render={(exporting) => (
            <ClassCard group={group} blocks={blocks} overrides={overrides} onOverride={onOverride} exporting={exporting} />
          )}
        />
      </div>
    </section>
  )
}
