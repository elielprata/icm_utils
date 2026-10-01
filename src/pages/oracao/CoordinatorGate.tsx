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
    return (
      <section className="panel login">
        <h2>Área do coordenador</h2>
        <p className="hint">
          Entre com sua conta Google para criar períodos e acompanhar as inscrições. Quem só vai se inscrever não
          precisa entrar: basta o link da igreja.
        </p>
        <button
          className="primary"
          onClick={() => signInWithGoogle().catch((e: Error) => setError(e.message))}
        >
          Entrar com Google
        </button>
        {error && <p className="status warn">{error}</p>}
      </section>
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
