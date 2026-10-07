import { useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { firebaseReady } from '../../lib/firebase'
import { logout, signInWithGoogle, useAuthUser } from '../../lib/useAuth'

/** Mostra o conteúdo só para quem entrou com a conta Google. */
export function SecretarioGate({ children }: { children: (user: User) => ReactNode }) {
  const user = useAuthUser()
  const [error, setError] = useState<string | null>(null)

  if (!firebaseReady) {
    return (
      <section className="panel">
        <h2>Firebase ainda não configurado</h2>
        <p className="hint">
          Cole as chaves do seu projeto Firebase em <code>src/firebase-config.ts</code> para usar o Calendário de
          Eventos.
        </p>
      </section>
    )
  }
  if (user === undefined) return <p className="hint">Carregando…</p>
  if (!user) {
    return (
      <>
        <p className="cg-intro">
          Aqui se organiza o calendário de eventos, com as datas marcadas direto no mês, prontas para compartilhar
          em imagem ou por um link público de visualização.
        </p>

        <section className="panel">
          <h2>É secretário?</h2>
          <p className="hint">Entre com a conta Google para criar calendários, cadastrar eventos e compartilhar.</p>
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
      <p className="cg-signed-in">
        Conectado como <b>{user.email}</b> ·{' '}
        <button className="link" onClick={logout}>
          sair
        </button>
      </p>
      {children(user)}
    </>
  )
}
