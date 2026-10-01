import { formatDay, fromISO, toISO } from '../../lib/schedule'
import { senhorasMonths } from '../../lib/senhoras'

interface Props {
  id: string
  label: string
  /** Quarta-feira de escala (YYYY-MM-DD) */
  value: string
  onChange: (value: string) => void
}

const monthOf = (iso: string) => iso.slice(0, 7)
const wednesdaysOf = (month: string) => senhorasMonths(month, 1)[0].dates

/** Escolhe só quartas-feiras de escala: mês + 1ª a 4ª quarta (a 5ª nunca aparece). */
export function WednesdayPicker({ id, label, value, onChange }: Props) {
  const month = monthOf(value)
  const options = wednesdaysOf(month)
  const position = Math.max(
    options.findIndex((d) => toISO(d) === value),
    0,
  )

  return (
    <div className="field">
      <span>{label}</span>
      <div className="wed-picker">
        <input
          id={`${id}-month`}
          type="month"
          aria-label={`${label}: mês`}
          value={month}
          // Ao trocar o mês, mantém a mesma posição (1ª, 2ª, 3ª ou 4ª quarta).
          onChange={(e) => e.target.value && onChange(toISO(wednesdaysOf(e.target.value)[position]))}
        />
        <select id={id} aria-label={`${label}: quarta-feira`} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((d, i) => (
            <option key={toISO(d)} value={toISO(d)}>
              {i + 1}ª quarta · {formatDay(d)}
            </option>
          ))}
        </select>
      </div>
      <span className="picked">{fromISO(value).toLocaleDateString('pt-BR', { dateStyle: 'full' })}</span>
    </div>
  )
}
