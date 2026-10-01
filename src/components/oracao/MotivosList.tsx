import { motivoLines } from '../../lib/oracao'

/** Quadro "Motivos de oração" com um item por linha; não aparece se não houver motivos. */
export function MotivosList({ text, className = '' }: { text?: string; className?: string }) {
  const lines = motivoLines(text)
  if (lines.length === 0) return null
  return (
    <div className={`motivos ${className}`}>
      <div className="motivos-title">Motivos de oração</div>
      <ul>
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
