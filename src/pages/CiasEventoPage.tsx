import { useEffect, useState, type CSSProperties } from 'react'

import { loadState } from '../lib/storage'
import {
  editTurma,
  emptyEvento,
  loadEvento,
  saveEvento,
  visibleTurmas,
  type CiasEvento,
  type TurmaEvento,
} from '../lib/ciasEvento'
import { formatName } from '../lib/names'
import { PageHeader } from '../components/PageHeader'
import { Shareable } from '../components/Shareable'
import { EventCard } from '../components/EventCard'

/** Evento das CIAs (Evangelização, Seminário…): uma tela só e uma imagem com todas as turmas. */
export function CiasEventoPage() {
  // As turmas e as professoras vêm da escala dos domingos
  const [classes] = useState(() => loadState().classes)
  const [evento, setEvento] = useState<CiasEvento>(() => loadEvento(classes))
  const [error, setError] = useState<string | null>(null)
  const nothingShown = visibleTurmas(classes, evento.turmas).length === 0

  useEffect(() => {
    if (!saveEvento(evento)) setError('Não foi possível salvar no aparelho.')
  }, [evento])

  const set = (patch: Partial<CiasEvento>) => setEvento((e) => ({ ...e, ...patch }))
  const setTurma = (id: string, patch: Partial<TurmaEvento>) =>
    setEvento((e) => ({ ...e, turmas: { ...e.turmas, [id]: editTurma(e.turmas[id], patch) } }))

  return (
    <div className="app">
      <PageHeader title="🎉 Evento das CIAs" onReset={() => setEvento(emptyEvento(classes))} />

      <section className="panel event-form">
        <h2>Evento</h2>
        <div className="grid-fields">
          <label className="field">
            <span>Nome do evento</span>
            <input
              id="ev-name"
              value={evento.name}
              maxLength={60}
              placeholder="Ex.: Evangelização CIAs, Seminário CIAs"
              onChange={(e) => set({ name: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Igreja</span>
            <input
              id="ev-church"
              value={evento.church}
              maxLength={60}
              placeholder="Nome da igreja"
              onChange={(e) => set({ church: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Tema (opcional)</span>
            <input id="ev-tema" value={evento.tema} maxLength={120} onChange={(e) => set({ tema: e.target.value })} />
          </label>
        </div>

        <p className="hint">A arte do evento é a mesma para todo mundo e já vem no site.</p>
        {error && <p className="status warn">{error}</p>}
      </section>

      <section className="panel">
        <h2>Turmas</h2>
        <p className="hint">
          Marque <b>Mostrar na imagem</b> nas turmas que participam do evento (ao começar a preencher, ela já é
          marcada). Cada turma tem o seu dia e horário; em Palavra e Louvor, escolha uma professora ou digite outro
          nome.
        </p>
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
                <div className="turma-head">
                  <b>
                    {c.emoji} {c.name}
                  </b>
                  <label className="show-check">
                    <input
                      type="checkbox"
                      checked={t.show}
                      onChange={(e) => setTurma(c.id, { show: e.target.checked })}
                    />
                    Mostrar na imagem
                  </label>
                </div>
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
            blocked={nothingShown}
            warning={nothingShown ? 'Marque pelo menos uma turma em "Mostrar na imagem" para compartilhar.' : undefined}
            version={JSON.stringify([evento, classes])}
            render={(exporting) => <EventCard evento={evento} classes={classes} exporting={exporting} />}
          />
        </div>
      </section>
    </div>
  )
}
