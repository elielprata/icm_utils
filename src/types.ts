export interface ClassGroup {
  id: string
  name: string
  emoji: string
  color: string
  enabled: boolean
  /** A ordem define o rodízio. */
  people: string[]
}

export interface Config {
  /** Formato YYYY-MM */
  startMonth: string
  months: number
  /** 0 = domingo … 6 = sábado */
  weekday: number
}

/** Chave: `${dataISO}|${classId}` → nome escolhido manualmente */
export type Overrides = Record<string, string>

export interface AppState {
  config: Config
  classes: ClassGroup[]
  overrides: Overrides
}
