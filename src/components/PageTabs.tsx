import type { CSSProperties } from 'react'

export interface Tab<T extends string> {
  id: T
  label: string
  /** Cor da aba selecionada (padrão: a cor da página) */
  color?: string
}

/** Abas de página (ex.: Horários · Motivos · Lista, ou uma por classe das CIAs). */
export function PageTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Tab<T>[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="page-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === value}
          className={t.id === value ? 'on' : ''}
          style={t.color ? ({ '--tab-accent': t.color } as CSSProperties) : undefined}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
