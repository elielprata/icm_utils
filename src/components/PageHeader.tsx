interface Props {
  title: string
  onReset?: () => void
  back?: string
  backLabel?: string
}

export function PageHeader({ title, onReset, back = '#/', backLabel = 'Início' }: Props) {
  return (
    <>
      <a className="back" href={back}>
        ← {backLabel}
      </a>
      <header className="app-header">
        <h1>{title}</h1>
        {onReset && (
          <button className="ghost" onClick={() => confirm('Apagar todos os nomes e ajustes?') && onReset()}>
            Recomeçar
          </button>
        )}
      </header>
    </>
  )
}
