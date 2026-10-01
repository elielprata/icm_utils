import { useState } from 'react'
import { FirebaseError } from 'firebase/app'
import { ShareList, ShareMotivos } from '../../components/oracao/ShareOptions'
import { useMotivosImage } from '../../components/oracao/MotivosImage'
import { PeopleList } from '../../components/oracao/PeopleList'
import { Sheet } from '../../components/oracao/Sheet'
import { PageTabs } from '../../components/PageTabs'
import { ChurchLegend, firstShiftWhere, ShiftTabs, SlotGrid } from '../../components/oracao/SlotGrid'
import {
  bySlot,
  canSelfManage,
  cancelMine,
  formatDate,
  formatRange,
  hasMotivos,
  moveMine,
  nextLevel,
  NAME_MAX,
  openSlots,
  shiftOf,
  SHIFTS,
  signUp,
  slotLabel,
  SLOTS,
  type Entry,
  type MyEntry,
  type Period,
} from '../../lib/oracao'
import { firebaseReady } from '../../lib/firebase'
import { formatName } from '../../lib/names'
import { usePeriodData } from './usePeriodData'

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

/** Inscrições deste celular. A versão antiga guardava só o id (sem chave): continuam aparecendo, sem trocar. */
function readMine(periodId: string): MyEntry[] {
  return readStorage<(MyEntry | string)[]>(mineKey(periodId), []).map((m) =>
    typeof m === 'string' ? { id: m, key: '' } : m,
  )
}

type Tab = 'horarios' | 'motivos' | 'lista'
type SheetState = { kind: 'slot'; slot: number } | { kind: 'cancel'; mine: MyEntry } | null

/** Página aberta pelo link de uma igreja. */
export function OracaoSignup({ periodId, churchCode }: { periodId: string; churchCode: string }) {
  if (!firebaseReady) return <p className="hint app">Este link ainda não está ativo.</p>
  return <Signup periodId={periodId} churchCode={churchCode} />
}

function Signup({ periodId, churchCode }: { periodId: string; churchCode: string }) {
  const { period, entries, error } = usePeriodData(periodId)
  const image = useMotivosImage(periodId)
  const [tab, setTab] = useState<Tab>('horarios')

  if (error) return <Shell><p className="status warn">Não foi possível abrir a lista. Verifique a internet e tente de novo.</p></Shell>
  if (period === undefined) return <Shell><p className="hint">Carregando…</p></Shell>
  const church = period?.churches[churchCode]
  if (!period || !church) return <Shell><p className="status warn">Link inválido. Peça o link certo ao secretário.</p></Shell>

  const showMotivos = hasMotivos(period.motivos) || Boolean(image)
  const tabs: { id: Tab; label: string }[] = [
    { id: 'horarios', label: 'Horários' },
    ...(showMotivos ? [{ id: 'motivos' as Tab, label: 'Motivos' }] : []),
    { id: 'lista', label: 'Lista' },
  ]

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

      <PageTabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'horarios' && <Horarios period={period} entries={entries} churchCode={churchCode} />}
      {tab === 'motivos' && <ShareMotivos period={period} image={image} />}
      {tab === 'lista' && <ShareList period={period} entries={entries} />}
    </Shell>
  )
}

function Horarios({ period, entries, churchCode }: { period: Period; entries: Entry[]; churchCode: string }) {
  const [name, setName] = useState('')
  const [mine, setMine] = useState<MyEntry[]>(() => readMine(period.id))
  const [shift, setShift] = useState<number | null>(null)
  const [sheet, setSheet] = useState<SheetState>(null)
  const [moving, setMoving] = useState<MyEntry | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const slots = bySlot(entries)
  const byId = new Map(entries.map((e) => [e.id, e]))
  const movingEntry = moving ? byId.get(moving.id) : undefined
  const open = openSlots(slots, movingEntry?.id)
  if (movingEntry) open.delete(movingEntry.slot)
  const myEntries = mine.map((m) => ({ m, e: byId.get(m.id) })).filter((x): x is { m: MyEntry; e: Entry } => !!x.e)
  const mySlots = new Set(myEntries.map((x) => x.e.slot))
  const current = shift ?? firstShiftWhere((s) => open.has(s))
  const openIn = (sh: number) => [...open].filter((s) => shiftOf(s) === sh).length

  const saveMine = (next: MyEntry[]) => {
    setMine(next)
    writeStorage(mineKey(period.id), next)
  }

  const fail = (err: unknown, taken: string) => {
    const denied = err instanceof FirebaseError && err.code === 'permission-denied'
    setMessage({ ok: false, text: denied ? taken : 'Não foi possível concluir. Verifique a internet e tente de novo.' })
  }

  const book = async (slot: number) => {
    // Na troca o campo de nome não aparece: mantém o nome da inscrição atual.
    const trimmed = (moving && movingEntry ? movingEntry.name : name).trim()
    if (!trimmed) return setMessage({ ok: false, text: 'Digite seu nome para confirmar.' })
    setBusy(true)
    setMessage(null)
    try {
      const level = nextLevel(slots[slot])
      if (moving && movingEntry) {
        const next = await moveMine(period.id, moving, slot, level, trimmed, churchCode)
        saveMine(mine.map((m) => (m.id === moving.id ? next : m)))
        setMoving(null)
        setMessage({ ok: true, text: `Pronto! Seu horário agora é ${slotLabel(slot)}.` })
      } else {
        const created = await signUp(period.id, slot, level, trimmed, churchCode)
        saveMine([...mine, created])
        setMessage({ ok: true, text: `${formatName(trimmed)}, você ficou com ${slotLabel(slot)}. Deus abençoe!` })
      }
      setName('')
      setSheet(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      fail(err, moving ? 'Não foi possível trocar: o prazo terminou ou a vaga acabou de ser pega. Fale com o secretário se precisar.' : 'Esse horário acabou de ser pego por outra pessoa. Escolha outro.')
      setSheet(null)
    } finally {
      setBusy(false)
    }
  }

  const cancel = async (m: MyEntry) => {
    setBusy(true)
    setMessage(null)
    try {
      await cancelMine(period.id, m)
      saveMine(mine.filter((x) => x.id !== m.id))
      setMessage({ ok: true, text: 'Seu horário foi cancelado.' })
    } catch (err) {
      fail(err, 'O prazo para cancelar sozinho terminou. Fale com o secretário.')
    } finally {
      setBusy(false)
      setSheet(null)
    }
  }

  const min = Math.min(...slots.map((s) => s.length))
  const sheetSlot = sheet?.kind === 'slot' ? sheet.slot : null

  return (
    <>
      {myEntries.map(({ m, e }) => {
        const manageable = Boolean(m.key) && canSelfManage(period, e)
        return (
          <div key={m.id} className={`my-slot${moving?.id === m.id ? ' moving' : ''}`}>
            <div>
              <strong>✓ Seu horário: {slotLabel(e.slot)}</strong>
              <span>
                {e.name} · todos os dias de {formatRange(period)}
              </span>
            </div>
            {moving?.id === m.id ? (
              <button className="ghost" onClick={() => setMoving(null)}>
                Desistir da troca
              </button>
            ) : manageable ? (
              <div className="my-actions">
                <button className="ghost" disabled={busy} onClick={() => { setMoving(m); setShift(null); setMessage(null) }}>
                  Trocar horário
                </button>
                <button className="ghost danger" disabled={busy} onClick={() => setSheet({ kind: 'cancel', mine: m })}>
                  Cancelar
                </button>
              </div>
            ) : (
              <small>Para trocar ou cancelar, fale com o secretário.</small>
            )}
          </div>
        )
      })}
      {myEntries.some(({ m, e }) => m.key && canSelfManage(period, e)) && !moving && (
        <p className="hint window">
          Você pode trocar ou cancelar sozinho até {formatDate(period.start)} ou nas primeiras 24 horas depois de se
          inscrever.
        </p>
      )}

      {message && <p className={`status ${message.ok ? 'ok' : 'warn'}`}>{message.text}</p>}

      {moving ? (
        <p className="moving-banner">Toque numa vaga livre para trocar. Seu horário atual está em amarelo.</p>
      ) : (
        <p className="hint rule">
          Cada pessoa ora 15 minutos, no mesmo horário, todos os dias de {formatRange(period)}.{' '}
          {min === 0
            ? `Primeiro preenchemos os horários vagos (${open.size} ainda livres); depois todos voltam a abrir.`
            : `Todos os horários já têm ${min} pessoa${min > 1 ? 's' : ''}: pode escolher qualquer um.`}
        </p>
      )}

      <ShiftTabs shift={current} onChange={setShift} badge={openIn} />
      <SlotGrid
        slots={slots}
        churches={period.churches}
        shift={current}
        emptyLabel={(s) => (open.has(s) ? 'Livre' : 'Vago')}
        cellClass={(s) =>
          [open.has(s) && 'open', mySlots.has(s) && 'mine', sheetSlot === s && 'selected'].filter(Boolean).join(' ')
        }
        onSelect={(slot) => setSheet({ kind: 'slot', slot })}
      />
      <ChurchLegend
        churches={period.churches}
        extra={
          <span>
            <i className="free" />
            Livre
          </span>
        }
      />
      <p className="hint total">
        {SLOTS - slots.filter((s) => s.length === 0).length} de {SLOTS} horários com alguém orando.
      </p>

      {sheetSlot !== null && (
        <Sheet
          title={slotLabel(sheetSlot)}
          subtitle={`${SHIFTS[shiftOf(sheetSlot)].name} · todos os dias de ${formatRange(period)}`}
          onClose={() => setSheet(null)}
        >
          <PeopleList people={slots[sheetSlot]} churches={period.churches} />
          {mySlots.has(sheetSlot) && !moving ? (
            <>
              <p className="sheet-note">Este é o seu horário.</p>
              <button className="ghost wide" onClick={() => setSheet(null)}>
                Fechar
              </button>
            </>
          ) : open.has(sheetSlot) ? (
            <>
              {moving && movingEntry && (
                <p className="sheet-note">Você sai de {slotLabel(movingEntry.slot)}.</p>
              )}
              {!moving && (
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
              )}
              <div className="sheet-buttons">
                <button className="ghost" onClick={() => setSheet(null)}>
                  Voltar
                </button>
                <button className="primary" disabled={busy} onClick={() => book(sheetSlot)}>
                  {busy ? 'Salvando…' : moving ? 'Trocar para este horário' : 'Confirmar horário'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="sheet-note">
                {(() => {
                  const n = slots[sheetSlot].length
                  if (n === 0) return 'Este horário não está aberto agora.'
                  const people = (k: number) => `${k} pessoa${k > 1 ? 's' : ''}`
                  return `Já tem ${people(n)}. Abre de novo quando todos os horários tiverem ${people(n)}.`
                })()}
              </p>
              <button className="ghost wide" onClick={() => setSheet(null)}>
                Fechar
              </button>
            </>
          )}
        </Sheet>
      )}

      {sheet?.kind === 'cancel' && (
        <Sheet
          title="Cancelar seu horário?"
          subtitle={`${slotLabel(byId.get(sheet.mine.id)?.slot ?? 0)} deixa de ter o seu nome.`}
          onClose={() => setSheet(null)}
        >
          <div className="sheet-buttons">
            <button className="ghost" onClick={() => setSheet(null)}>
              Voltar
            </button>
            <button className="primary danger" disabled={busy} onClick={() => cancel(sheet.mine)}>
              {busy ? 'Cancelando…' : 'Sim, cancelar'}
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="app oracao signup">{children}</div>
}
