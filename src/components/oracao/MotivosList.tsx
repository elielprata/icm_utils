import { parseMotivos } from '../../lib/oracao'

/** Quadro "Motivos de oração" com títulos de seção e itens; não aparece se não houver motivos. */
export function MotivosList({ text, className = '' }: { text?: string; className?: string }) {
  const sections = parseMotivos(text)
  if (sections.length === 0) return null
  return (
    <div className={`motivos ${className}`}>
      <div className="motivos-title">Motivos de oração</div>
      {sections.map((s, i) => (
        <section key={i} className="motivos-section">
          {s.title && <h4>{s.title}</h4>}
          {s.items.length > 0 && (
            <ul>
              {s.items.map((item, k) => (
                <li key={k}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
