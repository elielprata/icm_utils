import { formatDay, formatFull, toISO } from '../../lib/schedule'
import { cycleAround, weekIndex, type SenhorasMonth } from '../../lib/senhoras'

interface Props {
  anchor: Date
  blocks: SenhorasMonth[]
  n: number
}

/** Quando o ciclo atual termina e o próximo começa, com a linha do tempo das quartas. */
export function CycleSummary({ anchor, blocks, n }: Props) {
  const first = blocks[0]?.dates[0]
  if (!first) return null
  const cycle = cycleAround(anchor, first, n)
  const days = blocks
    .flatMap((b) => [...b.dates.map((date) => ({ date, skipped: false })), ...b.skipped.map((date) => ({ date, skipped: true }))])
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  return (
    <div className="cycle">
      <div className="cycle-icon">🔄</div>
      <div className="cycle-body">
        <strong>Ciclo de {n} semanas: cada serva faz Palavra, Louvor e Preparo uma vez.</strong>
        <span>
          O ciclo atual vai de {formatFull(cycle.start)} até {formatFull(cycle.end)}. O próximo começa em{' '}
          <b>{formatFull(cycle.next)}</b>.
        </span>
        <div className="timeline">
          {days.map(({ date, skipped }) => {
            if (skipped) {
              return (
                <div key={toISO(date)} className="tl skip">
                  {formatDay(date)}
                  <small>5ª quarta</small>
                </div>
              )
            }
            const index = weekIndex(anchor, date)
            const round = ((index % n) + n) % n
            const odd = Math.floor(index / n) % 2 !== 0
            return (
              <div key={toISO(date)} className={`tl${odd ? ' alt' : ''}${round === 0 ? ' restart' : ''}`}>
                {formatDay(date)}
                <small>{round === 0 ? '↻ 1º' : `${round + 1}º`}</small>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
