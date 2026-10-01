import { useState } from 'react'
import { FirebaseError } from 'firebase/app'
import { Shareable } from '../../components/Shareable'
import { OracaoSheet } from '../../components/oracao/OracaoSheet'
import { MotivosList } from '../../components/oracao/MotivosList'
import { addEntry, bySlot, entryId, formatRange, minFill, nextLevel, NAME_MAX, slotLabel, SLOTS } from '../../lib/oracao'
import { firebaseReady } from '../../lib/firebase'
import { usePeriodData } from './usePeriodData'

const SHIFTS = ['Madrugada', 'Manhã', 'Tarde', 'Noite']
/** Turno do horário: 6 horas (24 horários) cada */
const shiftOf = (slot: number) => Math.floor(slot / 24)

const NAME_KEY = 'oracao:nome'
const mineKey = (periodId: string) => `oracao:minhas:${periodId}`

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* sem storage disponível */
  }
}

/** Página aberta pelo link de uma igreja: a pessoa digita o nome e agenda um horário disponível. */
export function OracaoSignup({ periodId, churchCode }: { periodId: string; churchCode: string }) {
  if (!firebaseReady) return <p className="hint app">Este link ainda não está ativo.</p>
  return <Signup periodId={periodId} churchCode={churchCode} />
}

function Signup({ periodId, churchCode }: { periodId: string; churchCode: string }) {
  const { period, entries, error } = usePeriodData(periodId)
  const [name, setName] = useState(() => readStorage(NAME_KEY, ''))
  const [onlyOpen, setOnlyOpen] = useState(true)
  const [confirming, setConfirming] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [mine, setMine] = useState<string[]>(() => readStorage(mineKey(periodId), []))

  if (error) return <Shell><p className="status warn">Não foi possível abrir a lista. Verifique a internet e tente de novo.</p></Shell>
  if (period === undefined) return <Shell><p className="hint">Carregando…</p></Shell>
  const church = period?.churches[churchCode]
  if (!period || !church) return <Shell><p className="status warn">Link inválido. Peça o link certo ao coordenador.</p></Shell>

  const slots = bySlot(entries)
  const min = minFill(slots)
  const isOpen = (slot: number) => slots[slot].length === min
  const openCount = slots.filter((s) => s.length === min).length
  const myEntries = entries.filter((e) => mine.includes(e.id))
  const visible = slots.map((people, slot) => ({ people, slot })).filter(({ slot }) => !onlyOpen || isOpen(slot))

  const book = async (slot: number) => {
    const trimmed = name.trim()
    if (!trimmed) {
      setMessage({ ok: false, text: 'Digite seu nome antes de agendar.' })
      return
    }
    setBusy(true)
    setMessage(null)
    const level = nextLevel(slots[slot])
    try {
      await addEntry(period.id, slot, level, trimmed, churchCode)
      const id = entryId(slot, level)
      const next = [...mine, id]
      setMine(next)
      writeStorage(mineKey(period.id), next)
      writeStorage(NAME_KEY, trimmed)
      setMessage({ ok: true, text: `${trimmed}, você ficou com ${slotLabel(slot)}. Deus abençoe!` })
    } catch (err) {
      const taken = err instanceof FirebaseError && err.code === 'permission-denied'
      setMessage({
        ok: false,
        text: taken
          ? 'Esse horário acabou de ser pego por outra pessoa. Escolha outro.'
          : 'Não foi possível agendar. Verifique a internet e tente de novo.',
      })
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  return (
    <Shell>
      <header className="signup-head">
        {period.motivo && <div className="kicker">{period.motivo}</div>}
        <h1>Oração Ininterrupta</h1>
        <div className="range">{formatRange(period)}</div>
        <div className="church-pill" style={{ borderColor: church.color, color: church.color }}>
          <i style={{ background: church.color }} />
          Inscrição pela <b>{church.name}</b>
        </div>
      </header>

      <MotivosList text={period.motivos} />

      <section className="panel">
        <label className="field">
          <span>Seu nome</span>
          <input
            id="nome"
            value={name}
            maxLength={NAME_MAX}
            placeholder="Como quer aparecer na lista"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <p className="hint rule">
          Cada pessoa ora 15 minutos, no mesmo horário, todos os dias do período.{' '}
          {min === 0
            ? `Primeiro preenchemos os ${openCount} horários vagos; depois os horários voltam a abrir.`
            : `Todos os horários já têm ${min} pessoa${min > 1 ? 's' : ''}: agora pode escolher qualquer um.`}
        </p>
        {myEntries.length > 0 && (
          <div className="mine">
            {myEntries.map((e) => (
              <span key={e.id}>
                ✓ {e.name} · <b>{slotLabel(e.slot)}</b>
              </span>
            ))}
            <small>Para trocar ou sair, fale com o coordenador.</small>
          </div>
        )}
        {message && <p className={`status ${message.ok ? 'ok' : 'warn'}`}>{message.text}</p>}
      </section>

      <div className="filters">
        <button className={onlyOpen ? 'on' : ''} onClick={() => setOnlyOpen(true)}>
          Disponíveis ({openCount})
        </button>
        <button className={onlyOpen ? '' : 'on'} onClick={() => setOnlyOpen(false)}>
          Todos ({SLOTS})
        </button>
      </div>

      <div className="signup-slots">
        {visible.map(({ people, slot }, i) => [
          (i === 0 || shiftOf(visible[i - 1].slot) !== shiftOf(slot)) && (
            <h3 key={`shift-${slot}`} className="shift">
              {SHIFTS[shiftOf(slot)]}
            </h3>
          ),
          <div key={slot} className={`signup-slot${people.length ? '' : ' empty'}${isOpen(slot) ? '' : ' closed'}`}>
            <span className="time">{slotLabel(slot)}</span>
            <span className="who">
              {people.length === 0 && <span className="vago">Vago</span>}
              {people.map((e) => (
                <span key={e.id} style={{ color: period.churches[e.church]?.color }}>
                  {e.name}
                </span>
              ))}
            </span>
            {isOpen(slot) &&
              (confirming === slot ? (
                <span className="confirm">
                  <button className="primary" disabled={busy} onClick={() => book(slot)}>
                    {busy ? '…' : 'Confirmar'}
                  </button>
                  <button className="ghost" disabled={busy} onClick={() => setConfirming(null)}>
                    ✕
                  </button>
                </span>
              ) : (
                <button className="primary" onClick={() => setConfirming(slot)}>
                  Agendar
                </button>
              ))}
          </div>,
        ])}
      </div>

      <section>
        <h2 className="preview-title">Lista completa</h2>
        <div className="cards">
          <Shareable
            fileName="oracao-ininterrupta.png"
            version={JSON.stringify([period, entries])}
            render={(exporting) => <OracaoSheet period={period} entries={entries} exporting={exporting} />}
          />
        </div>
      </section>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="app oracao signup">{children}</div>
}
