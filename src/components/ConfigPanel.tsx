import type { Config } from '../types'
import { WEEKDAYS } from '../lib/schedule'

interface Props {
  config: Config
  onChange: (config: Config) => void
}

export function ConfigPanel({ config, onChange }: Props) {
  const set = <K extends keyof Config>(key: K, value: Config[K]) => onChange({ ...config, [key]: value })

  return (
    <section className="panel">
      <h2>Configuração</h2>
      <div className="grid-fields">
        <label className="field">
          <span>Mês inicial</span>
          <input
            type="month"
            value={config.startMonth}
            onChange={(e) => e.target.value && set('startMonth', e.target.value)}
          />
        </label>
        <label className="field">
          <span>Quantos meses</span>
          <select value={config.months} onChange={(e) => set('months', Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Dia da aula</span>
          <select value={config.weekday} onChange={(e) => set('weekday', Number(e.target.value))}>
            {WEEKDAYS.map((w, i) => (
              <option key={w} value={i}>
                {w}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
