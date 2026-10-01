import { useEffect, type ReactNode } from 'react'

interface Props {
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
}

/** Janela que sobe de baixo (no celular) ou aparece no centro (no computador). */
export function Sheet({ title, subtitle, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" />
        <h3>{title}</h3>
        {subtitle && <p className="sheet-sub">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

/** Abas de página (ex.: Horários · Motivos · Lista) */
export function PageTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[]
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
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
