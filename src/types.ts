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

/** Chave: `${dataISO}|${classId ou função}` → nome escolhido manualmente */
export type Overrides = Record<string, string>

export interface AppState {
  config: Config
  classes: ClassGroup[]
  overrides: Overrides
}

export interface SenhorasState {
  /** Formato YYYY-MM */
  startMonth: string
  months: number
  /** Quarta-feira (YYYY-MM-DD) em que foi o 1º rodízio; as demais são contadas a partir dela */
  anchor: string
  /** Mostrar o número do rodízio também na imagem */
  showRoundsInImage: boolean
  /** Servas na ordem da numeração da tabela (1, 2, 3…) */
  people: string[]
  overrides: Overrides
}
