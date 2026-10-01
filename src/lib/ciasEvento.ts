import type { ClassGroup } from '../types'
import { formatName } from './names'
import { fromISO, WEEKDAYS } from './schedule'

/** Uma turma no evento: o seu dia, horário e quem faz a Palavra e o Louvor (escolhidos à mão). */
export interface TurmaEvento {
  /** YYYY-MM-DD */
  date: string
  /** HH:MM */
  time: string
  palavra: string
  louvor: string
}

/** Evento das CIAs (Evangelização, Seminário…), preenchido pela igreja, com todas as turmas numa imagem. */
export interface CiasEvento {
  name: string
  church: string
  tema: string
  /** Arte do evento, reduzida (data URL) */
  image: string | null
  /** Chave = id da turma na escala dos domingos */
  turmas: Record<string, TurmaEvento>
}

const KEY = 'cias-evento:v1'
const emptyTurma = (): TurmaEvento => ({ date: '', time: '', palavra: '', louvor: '' })

/** "Domingo, 18/10 · 09:00" (ou só a parte preenchida) */
export function turmaWhen({ date, time }: Pick<TurmaEvento, 'date' | 'time'>): string {
  const parts: string[] = []
  if (date) {
    const d = fromISO(date)
    parts.push(`${WEEKDAYS[d.getDay()]}, ${date.slice(8, 10)}/${date.slice(5, 7)}`)
  }
  if (time) parts.push(time)
  return parts.join(' · ')
}

/** Evento em branco, com uma linha vazia para cada turma. */
export function emptyEvento(classes: Pick<ClassGroup, 'id'>[]): CiasEvento {
  return {
    name: 'Evangelização CIAs',
    church: '',
    tema: '',
    image: null,
    turmas: Object.fromEntries(classes.map((c) => [c.id, emptyTurma()])),
  }
}

/** Lê o evento salvo; cada turma da escala ganha a sua linha, e os nomes ficam formatados. */
export function loadEvento(classes: Pick<ClassGroup, 'id'>[]): CiasEvento {
  let saved: Partial<CiasEvento> = {}
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<CiasEvento>
  } catch {
    /* dados corrompidos: começa de novo */
  }
  const turmas: Record<string, TurmaEvento> = {}
  for (const c of classes) {
    const t = { ...emptyTurma(), ...saved.turmas?.[c.id] }
    turmas[c.id] = { ...t, palavra: formatName(t.palavra), louvor: formatName(t.louvor) }
  }
  const empty = emptyEvento(classes)
  return {
    name: saved.name ?? empty.name,
    church: saved.church ?? empty.church,
    tema: saved.tema ?? empty.tema,
    image: saved.image ?? empty.image,
    turmas,
  }
}

/** Salva no aparelho. Devolve `false` se não couber (ex.: imagem grande demais para o navegador). */
export function saveEvento(evento: CiasEvento): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(evento))
    return true
  } catch {
    return false
  }
}
