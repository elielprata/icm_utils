import { useEffect, useState, type CSSProperties } from 'react'

import { loadState } from '../lib/storage'
import { emptyEvento, loadEvento, saveEvento, type CiasEvento, type TurmaEvento } from '../lib/ciasEvento'
import { compressImage } from '../lib/imageFile'
import { formatName } from '../lib/names'
import { PageHeader } from '../components/PageHeader'
import { Shareable } from '../components/Shareable'
import { EventCard } from '../components/EventCard'

/** Arte guardada no navegador: menor que a da Oração, para sobrar espaço no aparelho. */
const ART_MAX_CHARS = 700_000

/** Evento das CIAs (Evangelização, Seminário…): uma tela só e uma imagem com todas as turmas. */
export function CiasEventoPage() {
  // As turmas e as professoras vêm da escala dos domingos
  const [classes] = useState(() => loadState().classes)
  const [evento, setEvento] = useState<CiasEvento>(() => loadEvento(classes))
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!saveEvento(evento)) setError('Não foi possível salvar no aparelho. Tente uma imagem menor.')
  }, [evento])

  const set = (patch: Partial<CiasEvento>) => setEvento((e) => ({ ...e, ...patch }))
  const setTurma = (id: string, patch: Partial<TurmaEvento>) =>
    setEvento((e) => ({ ...e, turmas: { ...e.turmas, [id]: { ...e.turmas[id], ...patch } } }))

  const chooseImage = async (file: File | undefined) => {
    if (!file) return
    setSending(true)
    setError(null)
    try {
      set({ image: await compressImage(file, ART_MAX_CHARS) })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="app">
      <PageHeader title="🎉 Evento das CIAs" onReset={() => setEvento(emptyEvento(classes))} />

      <section className="panel event-form">
        <h2>Evento</h2>
        <div className="grid-fields">
          <label className="field">
            <span>Nome do evento</span>
            <input id="ev-name" value={evento.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label className="field">
            <span>Igreja</span>
            <input id="ev-church" value={evento.church} maxLength={60} placeholder="Nome da igreja" onChange={(e) => set({ church: e.target.value })} />
          </label>
          <label className="field">
            <span>Tema (opcional)</span>
            <input id="ev-tema" value={evento.tema} maxLength={120} onChange={(e) => set({ tema: e.target.value })} />
          </label>
        </div>

        <div className="field event-image">
          <span>Imagem do evento</span>
          {evento.image && <img className="event-art" src={evento.image} alt="Arte do evento" />}
          <div className="image-row">
            <label className={`file-button${sending ? ' disabled' : ''}`}>
              {sending ? 'Enviando…' : evento.image ? 'Trocar imagem' : 'Escolher imagem'}
              <input
                id="ev-image"
                type="file"
                accept="image/*"
                disabled={sending}
                onChange={(e) => {
                  chooseImage(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>
            {evento.image && (
              <button type="button" className="ghost" onClick={() => set({ image: null })}>
                Remover
              </button>
            )}
          </div>
          <p className="hint">Sem imagem, a escala usa a arte padrão das CIAs.</p>
        </div>
        {error && <p className="status warn">{error}</p>}
      </section>

      <section className="panel">
        <h2>Todas as turmas</h2>
        <p className="hint">Cada turma tem o seu dia e horário. Palavra e Louvor: escolha uma professora ou digite outro nome.</p>
        <div className="turmas">
          {classes.map((c) => {
            const t = evento.turmas[c.id]
            const name = (field: 'palavra' | 'louvor') => (
              <label className="field">
                <span>{field === 'palavra' ? 'Palavra' : 'Louvor'}</span>
                <input
                  list={`sug-${c.id}`}
                  value={t[field]}
                  maxLength={40}
                  onChange={(e) => setTurma(c.id, { [field]: e.target.value })}
                  onBlur={(e) => setTurma(c.id, { [field]: formatName(e.target.value) })}
                />
              </label>
            )
            return (
              <div key={c.id} className="turma-row" style={{ '--accent': c.color } as CSSProperties}>
                <b>
                  {c.emoji} {c.name}
                </b>
                <div className="turma-fields">
                  <label className="field">
                    <span>Data</span>
                    <input type="date" value={t.date} onChange={(e) => setTurma(c.id, { date: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Horário</span>
                    <input type="time" value={t.time} onChange={(e) => setTurma(c.id, { time: e.target.value })} />
                  </label>
                  {name('palavra')}
                  {name('louvor')}
                </div>
                <datalist id={`sug-${c.id}`}>
                  {c.people.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="preview-title">Imagem do evento</h2>
        <div className="cards">
          <Shareable
            fileName="evento-cias.png"
            version={JSON.stringify([evento, classes])}
            render={(exporting) => <EventCard evento={evento} classes={classes} exporting={exporting} />}
          />
        </div>
      </section>
    </div>
  )
}
