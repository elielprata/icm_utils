import type { CSSProperties, ReactNode } from 'react'
import { SHIFTS, SLOTS_PER_SHIFT, slotLabel, slotStart, type Church, type Entry } from '../../lib/oracao'

interface GridProps {
  slots: Entry[][]
  churches: Record<string, Church>
  shift: number
  onSelect: (slot: number) => void
  /** Classes extras por horário (ex.: "open", "mine", "selected") */
  cellClass?: (slot: number) => string
  /** Texto de um horário sem ninguém */
  emptyLabel?: (slot: number) => string
}

/** Um turno (6 horas) em grade de 4 colunas (uma hora por linha); cada quadradinho mostra a sua hora. */
export function SlotGrid({ slots, churches, shift, onSelect, cellClass, emptyLabel }: GridProps) {
  const first = shift * SLOTS_PER_SHIFT
  const shiftSlots = Array.from({ length: SLOTS_PER_SHIFT }, (_, i) => first + i)

  return (
    <div className="slot-grid" role="grid">
      {shiftSlots.map((slot) => {
        const people = slots[slot]
        const color = people[0] ? churches[people[0].church]?.color : undefined
        return (
          <button
            key={slot}
            type="button"
            className={`sg-cell${people.length ? '' : ' empty'} ${cellClass?.(slot) ?? ''}`}
            style={{ '--cc': color } as CSSProperties}
            aria-label={`${slotLabel(slot)}: ${people.map((p) => p.name).join(', ') || 'vago'}`}
            onClick={() => onSelect(slot)}
          >
            <span className="sg-time">{slotStart(slot)}</span>
            {people.length ? (
              <span className="sg-who">
                <span className="sg-name">{people[0].name}</span>
                {people.length > 1 && <span className="sg-more">+{people.length - 1}</span>}
              </span>
            ) : (
              <span className="sg-empty">{emptyLabel?.(slot) ?? 'Vago'}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface TabsProps {
  shift: number
  onChange: (shift: number) => void
  /** Número no canto da aba (ex.: vagas abertas no turno); 0 esconde */
  badge: (shift: number) => number
}

export function ShiftTabs({ shift, onChange, badge }: TabsProps) {
  return (
    <div className="shift-tabs" role="tablist">
      {SHIFTS.map((s, i) => (
        <button
          key={s.name}
          type="button"
          role="tab"
          aria-selected={i === shift}
          className={i === shift ? 'on' : ''}
          onClick={() => onChange(i)}
        >
          <span>
            {s.name}
            {badge(i) > 0 && <b className="badge">{badge(i)}</b>}
          </span>
          <small>{s.hours}</small>
        </button>
      ))}
    </div>
  )
}

/** Legenda das cores das igrejas */
export function ChurchLegend({ churches, extra }: { churches: Record<string, Church>; extra?: ReactNode }) {
  return (
    <div className="sg-legend">
      {extra}
      {Object.entries(churches)
        .sort((a, b) => a[1].order - b[1].order)
        .map(([code, c]) => (
          <span key={code}>
            <i style={{ background: c.color }} />
            {c.name}
          </span>
        ))}
    </div>
  )
}

/** Turno que tem o primeiro horário que satisfaz `test` (ou 0). */
export function firstShiftWhere(test: (slot: number) => boolean): number {
  for (let slot = 0; slot < SLOTS_PER_SHIFT * SHIFTS.length; slot++) {
    if (test(slot)) return Math.floor(slot / SLOTS_PER_SHIFT)
  }
  return 0
}
