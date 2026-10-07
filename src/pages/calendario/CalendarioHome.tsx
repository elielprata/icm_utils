import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { PageHeader } from '../../components/PageHeader'
import { createCalendar, watchMyCalendars, type Calendar } from '../../lib/calendario'
import { SecretarioGate } from './SecretarioGate'

/** Área do secretário: seus calendários e criação de um novo. */
export function CalendarioHome() {
  return (
    <div className="app calendario">
      <PageHeader title="📅 Calendário de Eventos" />
      <SecretarioGate>{(user) => <Calendars user={user} />}</SecretarioGate>
    </div>
  )
}

function Calendars({ user }: { user: User }) {
  const [calendars, setCalendars] = useState<Calendar[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => watchMyCalendars(user.email!, setCalendars, (e) => setError(e.message)), [user.email])

  const create = async () => {
    setSaving(true)
    try {
      const id = await createCalendar(name.trim(), user.email!)
      location.hash = `#/calendario/admin/${id}`
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>Seus calendários</h2>
          {!creating && (
            <button className="primary" onClick={() => setCreating(true)}>
              + Novo calendário
            </button>
          )}
        </div>
        {error && <p className="status warn">Não foi possível carregar: {error}</p>}
        {calendars === null && !error && <p className="hint">Carregando…</p>}
        {calendars?.length === 0 && !creating && <p className="hint">Nenhum calendário ainda. Crie o primeiro.</p>}
        <div className="cg-calendar-list">
          {calendars?.map((c) => (
            <a key={c.id} className="cg-calendar-item" href={`#/calendario/admin/${c.id}`}>
              <strong>{c.name || 'Calendário de Eventos'}</strong>
              <span>{c.admins.length} secretário{c.admins.length === 1 ? '' : 's'}</span>
            </a>
          ))}
        </div>
      </section>

      {creating && (
        <section className="panel">
          <h2>Novo calendário</h2>
          <label className="field">
            <span>Nome</span>
            <input
              value={name}
              maxLength={120}
              placeholder="Ex.: Programação"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <p className="hint">Esse nome aparece no topo da imagem que você for compartilhar.</p>
          <button className="primary" disabled={saving} onClick={create}>
            {saving ? 'Criando…' : 'Criar calendário'}
          </button>
        </section>
      )}
    </>
  )
}
