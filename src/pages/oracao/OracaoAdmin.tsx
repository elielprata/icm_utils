import { useState } from 'react'
import type { User } from 'firebase/auth'
import { PageHeader } from '../../components/PageHeader'
import { ShareList, ShareMotivos } from '../../components/oracao/ShareOptions'
import { PeriodForm } from '../../components/oracao/PeriodForm'
import { PeopleList } from '../../components/oracao/PeopleList'
import { PageTabs, Sheet } from '../../components/oracao/Sheet'
import { ChurchLegend, firstShiftWhere, ShiftTabs, SlotGrid } from '../../components/oracao/SlotGrid'
import {
  adminAdd,
  adminMove,
  adminRemove,
  adminUpdate,
  bySlot,
  formatRange,
  hasMotivos,
  minFill,
  NAME_MAX,
  nextLevel,
  shiftOf,
  SHIFTS,
  signupLink,
  slotLabel,
  SLOTS,
  updatePeriod,
  type Entry,
  type Period,
} from '../../lib/oracao'
import { CoordinatorGate } from './CoordinatorGate'
import { usePeriodData } from './usePeriodData'

type Tab = 'horarios' | 'links' | 'imagem' | 'configurar'

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
  const [tab, setTab] = useState<Tab>('horarios')

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
      <div className="period-title">
        <strong>{period.motivo || 'Oração Ininterrupta'}</strong>
        <span>{formatRange(period)}</span>
      </div>
      <PageTabs
        tabs={[
          { id: 'horarios', label: 'Horários' },
          { id: 'links', label: 'Links' },
          { id: 'imagem', label: 'Compartilhar' },
          { id: 'configurar', label: 'Configurar' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'horarios' && <Slots period={period} entries={entries} />}
      {tab === 'links' && <ChurchLinks period={period} counts={counts} />}
      {tab === 'imagem' && (
        <>
          <h2 className="share-title">Lista de horários</h2>
          <ShareList period={period} entries={entries} />
          {hasMotivos(period.motivos) && (
            <>
              <h2 className="share-title">Motivos de oração</h2>
              <ShareMotivos period={period} />
            </>
          )}
        </>
      )}
      {tab === 'configurar' && (
        <>
          <section className="panel">
            <h2>Período e igrejas</h2>
            <PeriodForm
              key={JSON.stringify([period.motivo, period.motivos, period.start, period.end, period.churches])}
              initial={period}
              counts={counts}
              submitLabel="Salvar alterações"
              onSubmit={(draft) => updatePeriod(period.id, draft)}
            />
          </section>
          <Coordinators period={period} me={user.email!.toLowerCase()} />
        </>
      )}
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

type Editing = { entry: Entry; name: string; church: string } | null

function Slots({ period, entries }: { period: Period; entries: Entry[] }) {
  const slots = bySlot(entries)
  const churchCodes = Object.keys(period.churches)
  const [shift, setShift] = useState(() => firstShiftWhere((s) => slots[s].length === 0))
  const [selected, setSelected] = useState<number | null>(null)
  const [moving, setMoving] = useState<Entry | null>(null)
  const [moveTarget, setMoveTarget] = useState<number | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const [newName, setNewName] = useState('')
  const [newChurch, setNewChurch] = useState(churchCodes[0] ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filled = slots.filter((s) => s.length > 0).length
  const min = minFill(slots)
  const emptyIn = (sh: number) => slots.filter((s, slot) => s.length === 0 && shiftOf(slot) === sh).length

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setBusy(false)
    }
  }

  const closeAll = () => {
    setSelected(null)
    setEditing(null)
    setMoveTarget(null)
    setNewName('')
  }

  const select = (slot: number) => {
    if (moving) {
      if (slot !== moving.slot) setMoveTarget(slot)
      return
    }
    setSelected(slot)
  }

  return (
    <section className="panel">
      <div className="stat">
        <span>
          <b>{filled}</b> de {SLOTS} horários preenchidos
        </span>
        <span>{SLOTS - filled} vagos</span>
      </div>
      <div className="bar">
        <i style={{ width: `${(filled / SLOTS) * 100}%` }} />
      </div>
      <p className="hint">
        {min === 0
          ? 'A inscrição pelo link está aberta só nos horários vagos.'
          : `Todos têm ${min} pessoa${min > 1 ? 's' : ''}: a inscrição pelo link está aberta em qualquer horário.`}{' '}
        Toque num horário para mover, corrigir, tirar ou encaixar alguém.
      </p>
      {error && <p className="status warn">{error}</p>}

      {moving && (
        <div className="moving-banner">
          <span>
            Movendo <b>{moving.name}</b> ({slotLabel(moving.slot)}): toque no horário de destino.
          </span>
          <button className="ghost" onClick={() => setMoving(null)}>
            Cancelar
          </button>
        </div>
      )}

      <ShiftTabs shift={shift} onChange={setShift} badge={emptyIn} />
      <SlotGrid
        slots={slots}
        churches={period.churches}
        shift={shift}
        onSelect={select}
        cellClass={(s) =>
          [slots[s].length === 0 && 'open', (selected === s || moveTarget === s) && 'selected', moving?.slot === s && 'mine']
            .filter(Boolean)
            .join(' ')
        }
      />
      <ChurchLegend churches={period.churches} />

      {selected !== null && !moving && (
        <Sheet title={slotLabel(selected)} subtitle={SHIFTS[shiftOf(selected)].name} onClose={closeAll}>
          <PeopleList
            people={slots[selected]}
            churches={period.churches}
            actions={(e) => (
              <span className="pl-actions">
                <button className="ghost" onClick={() => { setMoving(e); setSelected(null) }}>
                  Mover
                </button>
                <button className="ghost" onClick={() => setEditing({ entry: e, name: e.name, church: e.church })}>
                  Editar
                </button>
                <button
                  className="ghost danger"
                  disabled={busy}
                  onClick={() => confirm(`Tirar ${e.name} de ${slotLabel(e.slot)}?`) && run(() => adminRemove(period.id, e.id))}
                >
                  Tirar
                </button>
              </span>
            )}
          />

          {editing && (
            <form
              className="sheet-form"
              onSubmit={async (ev) => {
                ev.preventDefault()
                if (!editing.name.trim()) return
                const ok = await run(() =>
                  adminUpdate(period.id, editing.entry.id, { name: editing.name.trim().slice(0, NAME_MAX), church: editing.church }),
                )
                if (ok) setEditing(null)
              }}
            >
              <b>Editar {editing.entry.name}</b>
              <input
                aria-label="Nome"
                value={editing.name}
                maxLength={NAME_MAX}
                onChange={(ev) => setEditing({ ...editing, name: ev.target.value })}
              />
              <select aria-label="Igreja" value={editing.church} onChange={(ev) => setEditing({ ...editing, church: ev.target.value })}>
                {churchCodes.map((code) => (
                  <option key={code} value={code}>
                    {period.churches[code].name}
                  </option>
                ))}
              </select>
              <div className="sheet-buttons">
                <button type="button" className="ghost" onClick={() => setEditing(null)}>
                  Voltar
                </button>
                <button className="primary" disabled={busy}>
                  Salvar
                </button>
              </div>
            </form>
          )}

          {!editing && (
            <form
              className="sheet-form"
              onSubmit={async (ev) => {
                ev.preventDefault()
                if (!newName.trim()) return
                const ok = await run(() => adminAdd(period.id, selected, nextLevel(slots[selected]), newName, newChurch))
                if (ok) setNewName('')
              }}
            >
              <b>Encaixar alguém aqui</b>
              <input aria-label="Nome" placeholder="Nome" value={newName} maxLength={NAME_MAX} onChange={(ev) => setNewName(ev.target.value)} />
              <select aria-label="Igreja" value={newChurch} onChange={(ev) => setNewChurch(ev.target.value)}>
                {churchCodes.map((code) => (
                  <option key={code} value={code}>
                    {period.churches[code].name}
                  </option>
                ))}
              </select>
              <div className="sheet-buttons">
                <button type="button" className="ghost" onClick={closeAll}>
                  Fechar
                </button>
                <button className="primary" disabled={busy || !newName.trim()}>
                  Encaixar
                </button>
              </div>
            </form>
          )}
        </Sheet>
      )}

      {moving && moveTarget !== null && (
        <Sheet
          title={`Mover ${moving.name} para ${slotLabel(moveTarget)}?`}
          subtitle={`Sai de ${slotLabel(moving.slot)}.${slots[moveTarget].length ? ` Já tem ${slots[moveTarget].length} pessoa(s) no destino.` : ''}`}
          onClose={() => setMoveTarget(null)}
        >
          <PeopleList people={slots[moveTarget]} churches={period.churches} />
          <div className="sheet-buttons">
            <button className="ghost" onClick={() => setMoveTarget(null)}>
              Voltar
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                const ok = await run(() => adminMove(period.id, moving, moveTarget, nextLevel(slots[moveTarget])))
                if (ok) {
                  setShift(shiftOf(moveTarget))
                  setMoving(null)
                  setMoveTarget(null)
                }
              }}
            >
              Mover
            </button>
          </div>
        </Sheet>
      )}
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
        Quem estiver nesta lista entra com a conta Google e pode editar o período, mover, tirar e encaixar pessoas.
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
