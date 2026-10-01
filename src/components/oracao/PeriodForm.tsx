import { useState } from 'react'
import { CHURCH_COLORS, hasMotivos, MOTIVOS_MAX, randomCode, type Church, type Period } from '../../lib/oracao'
import { Modal } from './Sheet'
import { MotivosCard } from './ShareOptions'

export type PeriodDraft = Pick<Period, 'motivo' | 'motivos' | 'start' | 'end' | 'churches'>

/** Partes do formulário: na criação aparecem todas; em Configurar, uma por aba. */
export type PeriodSection = 'periodo' | 'igrejas' | 'motivos'
const ALL_SECTIONS: PeriodSection[] = ['periodo', 'motivos', 'igrejas']

interface Props {
  initial: PeriodDraft
  /** Inscritos por igreja: igreja com inscritos não pode ser removida */
  counts?: Record<string, number>
  submitLabel: string
  onSubmit: (draft: PeriodDraft) => Promise<void>
  sections?: PeriodSection[]
}

/** Título, motivos, datas e igrejas (nome + cor) de um período. */
export function PeriodForm({ initial, counts = {}, submitLabel, onSubmit, sections = ALL_SECTIONS }: Props) {
  const show = (s: PeriodSection) => sections.includes(s)
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
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
      // Só os campos do formulário: `initial` pode ser o período inteiro (com id, admins…),
      // e as regras do banco recusam campos a mais.
      await onSubmit({
        start: draft.start,
        end: draft.end,
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
      {show('periodo') && (
        <div className="grid-fields">
          <label className="field">
            <span>Título</span>
            <input
              id="motivo"
              value={draft.motivo}
              maxLength={120}
              placeholder="Ex.: Ministérios"
              onChange={(e) => setDraft({ ...draft, motivo: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Início</span>
            <input
              id="start"
              type="date"
              value={draft.start}
              onChange={(e) => setDraft({ ...draft, start: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Fim</span>
            <input
              id="end"
              type="date"
              value={draft.end}
              onChange={(e) => setDraft({ ...draft, end: e.target.value })}
            />
          </label>
        </div>
      )}

      {show('motivos') && (
        <>
          <label className="field motivos-field">
            <span>Motivos de oração</span>
            <textarea
              id="motivos"
              rows={8}
              maxLength={MOTIVOS_MAX}
              value={draft.motivos ?? ''}
              placeholder={'MOTIVOS PESSOAIS\n• Primeiro motivo\n• Segundo motivo\n\nMOTIVOS GERAIS\n• Outro motivo'}
              onChange={(e) => setDraft({ ...draft, motivos: e.target.value })}
            />
          </label>
          <p className="hint motivos-help">
            Comece cada motivo com <b>•</b>, <b>*</b> ou <b>-</b>. Uma linha sem marcador vira <b>título em negrito</b>,
            e uma linha em branco separa os grupos. Pode colar direto do PDF. Se os motivos vieram numa <b>imagem</b>,
            envie em <b>Imagem dos motivos</b>: com imagem, ela aparece no lugar do texto.
          </p>
          {hasMotivos(draft.motivos) && (
            <button type="button" className="ghost preview-button" onClick={() => setPreview(true)}>
              👁 Ver como vai ficar
            </button>
          )}
          {preview && (
            <Modal title="Como os motivos vão aparecer" onClose={() => setPreview(false)}>
              <MotivosCard period={draft} />
            </Modal>
          )}
        </>
      )}

      {show('igrejas') && (
        <>
          {sections.length > 1 && <h3 className="sub">Igrejas</h3>}
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
                  <button
                    type="button"
                    className="remove"
                    onClick={() => removeChurch(code)}
                    aria-label="Remover igreja"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="add-church" onClick={addChurch}>
              + Adicionar igreja
            </button>
          </div>
        </>
      )}

      {error && <p className="status warn">{error}</p>}
      <button className="primary save" disabled={saving} onClick={submit}>
        {saving ? 'Salvando…' : submitLabel}
      </button>
    </div>
  )
}
