import { useState } from 'react'
import type { User } from 'firebase/auth'
import { PageHeader } from '../../components/PageHeader'
import { Shareable } from '../../components/Shareable'
import { OracaoSheet } from '../../components/oracao/OracaoSheet'
import { PeriodForm } from '../../components/oracao/PeriodForm'
import {
  addEntry,
  bySlot,
  minFill,
  nextLevel,
  removeEntry,
  signupLink,
  slotLabel,
  SLOTS,
  updatePeriod,
  type Entry,
  type Period,
} from '../../lib/oracao'
import { CoordinatorGate } from './CoordinatorGate'
import { usePeriodData } from './usePeriodData'

export function OracaoAdmin({ periodId }: { periodId: string }) {
  return (
    <div className="app oracao">
      <PageHeader title="🙏 Oração Ininterrupta" back="#/oracao" backLabel="Meus períodos" />
      <CoordinatorGate>{(user) => <Admin periodId={periodId} user={user} />}</CoordinatorGate>
    </div>
  )
}

function Admin({ periodId, user }: { periodId: string; user: User }) {
  const { period, entries, error } = usePeriodData(periodId)

  if (error) return <p className="status warn">Não foi possível carregar o período: {error}</p>
  if (period === undefined) return <p className="hint">Carregando…</p>
  if (period === null) return <p className="status warn">Período não encontrado.</p>
  if (!period.admins.includes(user.email!.toLowerCase())) {
    return <p className="status warn">Você não é coordenador deste período. Peça para um coordenador incluir {user.email}.</p>
  }

  const counts: Record<string, number> = {}
  for (const e of entries) counts[e.church] = (counts[e.church] ?? 0) + 1

  return (
    <>
      <ChurchLinks period={period} counts={counts} />
      <Slots period={period} entries={entries} />

      <section>
        <h2 className="preview-title">Imagem da lista</h2>
        <div className="cards">
          <Shareable
            fileName="oracao-ininterrupta.png"
            version={JSON.stringify([period, entries])}
            render={(exporting) => <OracaoSheet period={period} entries={entries} exporting={exporting} />}
          />
        </div>
      </section>

      <section className="panel">
        <h2>Período e igrejas</h2>
        <PeriodForm
          key={JSON.stringify([period.motivo, period.start, period.end, period.churches])}
          initial={period}
          counts={counts}
          submitLabel="Salvar alterações"
          onSubmit={(draft) => updatePeriod(period.id, draft)}
        />
      </section>

      <Coordinators period={period} me={user.email!.toLowerCase()} />
    </>
  )
}

function ChurchLinks({ period, counts }: { period: Period; counts: Record<string, number> }) {
  const [copied, setCopied] = useState<string | null>(null)
  const churches = Object.entries(period.churches).sort((a, b) => a[1].order - b[1].order)

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(signupLink(period.id, code))
      setCopied(code)
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000)
    } catch {
      prompt('Copie o link:', signupLink(period.id, code))
    }
  }

  return (
    <section className="panel">
      <h2>Links de inscrição</h2>
      <p className="hint">Envie para cada igreja o link dela. Quem abrir já se inscreve com a cor certa.</p>
      <div className="links">
        {churches.map(([code, c]) => (
          <div key={code} className="link-row">
            <i style={{ background: c.color }} />
            <strong>{c.name}</strong>
            <span className="church-count">{counts[code] ?? 0} inscritos</span>
            <button className="primary" onClick={() => copy(code)}>
              {copied === code ? '✓ Copiado' : 'Copiar link'}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function Slots({ period, entries }: { period: Period; entries: Entry[] }) {
  const [adding, setAdding] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [church, setChurch] = useState(Object.keys(period.churches)[0] ?? '')
  const [error, setError] = useState<string | null>(null)
  const slots = bySlot(entries)
  const filled = slots.filter((s) => s.length > 0).length
  const min = minFill(slots)

  const add = async (slot: number) => {
    if (!name.trim()) return
    setError(null)
    try {
      await addEntry(period.id, slot, nextLevel(slots[slot]), name, church)
      setAdding(null)
      setName('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const remove = async (e: Entry) => {
    if (!confirm(`Tirar ${e.name} de ${slotLabel(e.slot)}?`)) return
    await removeEntry(period.id, e.id).catch((err: Error) => setError(err.message))
  }

  return (
    <section className="panel">
      <h2>Horários</h2>
      <p className="progress">
        <b>{filled}</b> de {SLOTS} horários preenchidos ·{' '}
        {min === 0
          ? `inscrição aberta só nos ${SLOTS - filled} horários vagos`
          : `todos têm ${min} pessoa${min > 1 ? 's' : ''}: inscrição aberta em qualquer horário`}
      </p>
      <p className="hint">Como coordenador, você pode tirar nomes (✕) e encaixar alguém em qualquer horário (+).</p>
      {error && <p className="status warn">{error}</p>}
      <div className="admin-slots">
        {slots.map((people, slot) => (
          <div key={slot} className={`admin-slot${people.length ? '' : ' empty'}`}>
            <span className="time">{slotLabel(slot)}</span>
            <span className="who">
              {people.map((e) => (
                <span key={e.id} className="person" style={{ borderColor: period.churches[e.church]?.color }}>
                  <span style={{ color: period.churches[e.church]?.color }}>{e.name}</span>
                  <button aria-label={`Tirar ${e.name}`} onClick={() => remove(e)}>
                    ✕
                  </button>
                </span>
              ))}
              {people.length === 0 && <span className="vago">Vago</span>}
            </span>
            <button className="plus" aria-label={`Encaixar alguém em ${slotLabel(slot)}`} onClick={() => setAdding(slot)}>
              +
            </button>
            {adding === slot && (
              <form
                className="encaixar"
                onSubmit={(e) => {
                  e.preventDefault()
                  add(slot)
                }}
              >
                <input autoFocus placeholder="Nome" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
                <select value={church} onChange={(e) => setChurch(e.target.value)} aria-label="Igreja">
                  {Object.entries(period.churches).map(([code, c]) => (
                    <option key={code} value={code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button className="primary" type="submit">
                  Encaixar
                </button>
                <button className="ghost" type="button" onClick={() => setAdding(null)}>
                  Cancelar
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function Coordinators({ period, me }: { period: Period; me: string }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const save = (admins: string[]) => updatePeriod(period.id, { admins }).catch((e: Error) => setError(e.message))

  return (
    <section className="panel">
      <h2>Coordenadores</h2>
      <p className="hint">
        Quem estiver nesta lista entra com a conta Google e pode editar o período, tirar nomes e encaixar pessoas.
      </p>
      <ul className="admins">
        {period.admins.map((a) => (
          <li key={a}>
            {a}
            {a === me ? (
              <span className="hint"> (você)</span>
            ) : (
              <button className="link" onClick={() => save(period.admins.filter((x) => x !== a))}>
                remover
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault()
          const value = email.trim().toLowerCase()
          if (!value.includes('@') || period.admins.includes(value)) return
          save([...period.admins, value])
          setEmail('')
        }}
      >
        <input type="email" placeholder="email@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit">Adicionar</button>
      </form>
      {error && <p className="status warn">{error}</p>}
    </section>
  )
}
