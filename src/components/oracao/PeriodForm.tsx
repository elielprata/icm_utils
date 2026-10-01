import { useState } from 'react'
import { CHURCH_COLORS, MOTIVOS_MAX, randomCode, type Church, type Period } from '../../lib/oracao'

export type PeriodDraft = Pick<Period, 'motivo' | 'motivos' | 'start' | 'end' | 'churches'>

interface Props {
  initial: PeriodDraft
  /** Inscritos por igreja: igreja com inscritos não pode ser removida */
  counts?: Record<string, number>
  submitLabel: string
  onSubmit: (draft: PeriodDraft) => Promise<void>
}

/** Título, motivos, datas e igrejas (nome + cor) de um período. */
export function PeriodForm({ initial, counts = {}, submitLabel, onSubmit }: Props) {
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const churches = Object.entries(draft.churches).sort((a, b) => a[1].order - b[1].order)

  const setChurch = (code: string, patch: Partial<Church>) =>
    setDraft((d) => ({ ...d, churches: { ...d.churches, [code]: { ...d.churches[code], ...patch } } }))

  const addChurch = () =>
    setDraft((d) => {
      const used = new Set(Object.values(d.churches).map((c) => c.color))
      const color = CHURCH_COLORS.find((c) => !used.has(c)) ?? CHURCH_COLORS[0]
      const order = Math.max(-1, ...Object.values(d.churches).map((c) => c.order)) + 1
      return { ...d, churches: { ...d.churches, [randomCode(6)]: { name: '', color, order } } }
    })

  const removeChurch = (code: string) =>
    setDraft((d) => {
      const next = { ...d.churches }
      delete next[code]
      return { ...d, churches: next }
    })

  const submit = async () => {
    if (!draft.start || !draft.end || draft.end < draft.start) return setError('Confira as datas do período.')
    if (churches.length === 0) return setError('Cadastre pelo menos uma igreja.')
    if (churches.some(([, c]) => !c.name.trim())) return setError('Dê um nome para todas as igrejas.')
    setError(null)
    setSaving(true)
    try {
      await onSubmit({
        ...draft,
        motivo: draft.motivo.trim(),
        motivos: (draft.motivos ?? '').trim(),
        churches: Object.fromEntries(churches.map(([code, c]) => [code, { ...c, name: c.name.trim() }])),
      })
    } catch (err) {
      setError('Não foi possível salvar: ' + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="period-form">
      <div className="grid-fields">
        <label className="field">
          <span>Título</span>
          <input
            id="motivo"
            value={draft.motivo}
            maxLength={120}
            placeholder="Ex.: Ministério Pr. Aginaldo"
            onChange={(e) => setDraft({ ...draft, motivo: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Início</span>
          <input id="start" type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
        </label>
        <label className="field">
          <span>Fim</span>
          <input id="end" type="date" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
        </label>
      </div>

      <label className="field motivos-field">
        <span>Motivos de oração (um por linha)</span>
        <textarea
          id="motivos"
          rows={6}
          maxLength={MOTIVOS_MAX}
          value={draft.motivos ?? ''}
          placeholder={'Pela nossa Pátria e pela nossa Nação 🇧🇷\nPelas autoridades constituídas\nPelas eleições que se aproximam'}
          onChange={(e) => setDraft({ ...draft, motivos: e.target.value })}
        />
      </label>

      <h3 className="sub">Igrejas</h3>
      <div className="church-edit">
        {churches.map(([code, c]) => (
          <div key={code} className="church-edit-row">
            <input
              type="color"
              aria-label="Cor da igreja"
              value={c.color}
              onChange={(e) => setChurch(code, { color: e.target.value })}
            />
            <input
              className="church-name"
              aria-label="Nome da igreja"
              placeholder="Nome da igreja"
              value={c.name}
              maxLength={40}
              onChange={(e) => setChurch(code, { name: e.target.value })}
            />
            <div className="swatches">
              {CHURCH_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={color === c.color ? 'on' : ''}
                  style={{ background: color }}
                  aria-label={`Usar a cor ${color}`}
                  onClick={() => setChurch(code, { color })}
                />
              ))}
            </div>
            {counts[code] ? (
              <span className="church-count">{counts[code]} inscritos</span>
            ) : (
              <button type="button" className="remove" onClick={() => removeChurch(code)} aria-label="Remover igreja">
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" className="add-church" onClick={addChurch}>
          + Adicionar igreja
        </button>
      </div>

      {error && <p className="status warn">{error}</p>}
      <button className="primary save" disabled={saving} onClick={submit}>
        {saving ? 'Salvando…' : submitLabel}
      </button>
    </div>
  )
}
