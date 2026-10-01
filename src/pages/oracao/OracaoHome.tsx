import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { PageHeader } from '../../components/PageHeader'
import { PeriodForm, type PeriodDraft } from '../../components/oracao/PeriodForm'
import { createPeriod, formatRange, watchMyPeriods, type Period } from '../../lib/oracao'
import { toISO } from '../../lib/schedule'
import { CoordinatorGate } from './CoordinatorGate'

function emptyDraft(): PeriodDraft {
  const today = new Date()
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return { motivo: '', motivos: '', start: toISO(today), end: toISO(end), churches: {} }
}

/** Área do coordenador: seus períodos e criação de um novo. */
export function OracaoHome() {
  return (
    <div className="app oracao">
      <PageHeader title="🙏 Oração Ininterrupta" />
      <CoordinatorGate>{(user) => <Periods user={user} />}</CoordinatorGate>
    </div>
  )
}

function Periods({ user }: { user: User }) {
  const [periods, setPeriods] = useState<Period[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => watchMyPeriods(user.email!, setPeriods, (e) => setError(e.message)), [user.email])

  const create = async (draft: PeriodDraft) => {
    const id = await createPeriod({ ...draft, admins: [user.email!.toLowerCase()] })
    location.hash = `#/oracao/admin/${id}`
  }

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>Suas listas de oração</h2>
          {!creating && (
            <button className="primary" onClick={() => setCreating(true)}>
              + Nova lista
            </button>
          )}
        </div>
        {error && <p className="status warn">Não foi possível carregar: {error}</p>}
        {periods === null && !error && <p className="hint">Carregando…</p>}
        {periods?.length === 0 && !creating && (
          <p className="hint">Nenhuma lista ainda. Crie a primeira e envie o link de cada igreja.</p>
        )}
        <div className="period-list">
          {periods?.map((p) => (
            <a key={p.id} className="period-item" href={`#/oracao/admin/${p.id}`}>
              <strong>{p.motivo || 'Oração Ininterrupta'}</strong>
              <span>{formatRange(p)}</span>
              <span className="dots">
                {Object.values(p.churches)
                  .sort((a, b) => a.order - b.order)
                  .map((c) => (
                    <i key={c.name} title={c.name} style={{ background: c.color }} />
                  ))}
              </span>
            </a>
          ))}
        </div>
      </section>

      {creating && (
        <section className="panel">
          <h2>Nova lista</h2>
          <PeriodForm initial={emptyDraft()} submitLabel="Criar lista" onSubmit={create} />
        </section>
      )}
    </>
  )
}
