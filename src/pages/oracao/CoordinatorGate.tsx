import { useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { firebaseReady } from '../../lib/firebase'
import { logout, signInWithGoogle, useAuthUser } from '../../lib/useAuth'

/** Mostra o conteúdo só para quem entrou com a conta Google. */
export function CoordinatorGate({ children }: { children: (user: User) => ReactNode }) {
  const user = useAuthUser()
  const [error, setError] = useState<string | null>(null)

  if (!firebaseReady) {
    return (
      <section className="panel">
        <h2>Firebase ainda não configurado</h2>
        <p className="hint">
          Cole as chaves do seu projeto Firebase em <code>src/firebase-config.ts</code> para usar a Oração Ininterrupta.
        </p>
      </section>
    )
  }
  if (user === undefined) return <p className="hint">Carregando…</p>
  if (!user) {
    // Explica só para que o sistema serve (sem interpretar a prática da igreja)
    return (
      <>
        <p className="oracao-intro">
          Aqui se organiza a lista da Oração Ininterrupta, com <b>uma ou mais igrejas</b> preenchendo a mesma lista,
          que depois é compartilhada em PDF ou imagem.
        </p>

        <div className="signup-callout">
          <b>🙋 Vai se inscrever?</b>
          <span>
            Abra o <b>link que a sua igreja mandou</b> no WhatsApp e escolha um horário livre. Não precisa criar conta.
          </span>
        </div>

        <section className="panel">
          <h2>Como funciona</h2>
          <ol className="how-steps">
            <li>O secretário cria a lista (datas e motivos) e cadastra as igrejas.</li>
            <li>Cada igreja recebe o seu link e manda no grupo.</li>
            <li>Cada pessoa escolhe um horário livre. Só repete horário quando todos tiverem alguém.</li>
            <li>A lista completa é compartilhada em PDF ou imagem.</li>
          </ol>
        </section>

        <section className="panel login">
          <h2>É secretário?</h2>
          <p className="hint">Entre com a conta Google para criar listas, enviar os links e acompanhar as inscrições.</p>
          <button className="primary" onClick={() => signInWithGoogle().catch((e: Error) => setError(e.message))}>
            Entrar com Google
          </button>
          {error && <p className="status warn">{error}</p>}
        </section>
      </>
    )
  }
  return (
    <>
      <p className="signed-in">
        Conectado como <b>{user.email}</b> ·{' '}
        <button className="link" onClick={logout}>
          sair
        </button>
      </p>
      {children(user)}
    </>
  )
}
