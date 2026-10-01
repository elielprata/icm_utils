interface Props {
  title: string
  onReset?: () => void
}

export function PageHeader({ title, onReset }: Props) {
  return (
    <>
      <a className="back" href="#/">
        ← Início
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
