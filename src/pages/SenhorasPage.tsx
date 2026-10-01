import { useEffect, useState } from 'react'
import type { SenhorasState } from '../types'
import { defaultSenhoras, loadSenhoras, saveSenhoras } from '../lib/storage'
import { formatDay, fromISO, MONTHS, toISO } from '../lib/schedule'
import { isOfficial, MIN_SERVAS, roundAt, rotationTable, senhorasMonths } from '../lib/senhoras'
import { PageHeader } from '../components/PageHeader'
import { PeopleEditor } from '../components/PeopleEditor'
import { Shareable } from '../components/Shareable'
import { SenhorasCard } from '../components/senhoras/SenhorasCard'
import { RotationTable } from '../components/senhoras/RotationTable'
import { CycleSummary } from '../components/senhoras/CycleSummary'
import { ListChangeDialog } from '../components/senhoras/ListChangeDialog'
import { WednesdayPicker } from '../components/senhoras/WednesdayPicker'

export function SenhorasPage() {
  const [state, setState] = useState<SenhorasState>(loadSenhoras)
  const [listChange, setListChange] = useState<{ from: number; to: number } | null>(null)

  useEffect(() => saveSenhoras(state), [state])

  const set = (patch: Partial<SenhorasState>) => setState((s) => ({ ...s, ...patch }))
  const setOverride = (key: string, name: string | null) =>
    setState((s) => {
      const overrides = { ...s.overrides }
      if (name) overrides[key] = name
      else delete overrides[key]
      return { ...s, overrides }
    })

  const setPeople = (people: string[]) => {
    const before = state.people.length
    set({ people })
    // Mudou a quantidade: a tabela muda, então pergunta a partir de quando ela vale.
    if (people.length !== before && before >= MIN_SERVAS && people.length >= MIN_SERVAS) {
      setListChange({ from: before, to: people.length })
    }
  }

  const n = state.people.length
  const table = rotationTable(n)
  const anchor = fromISO(state.anchor)
  const blocks = senhorasMonths(state.startMonth, state.months)
  const firstDate = blocks[0].dates[0]
  const roundOf = (date: Date) => roundAt(anchor, date, n)

  return (
    <div className="app">
      <PageHeader title="🌸 Escala do Trabalho de Senhoras" onReset={() => setState(defaultSenhoras())} />

      <section className="panel">
        <h2>Configuração</h2>
        <div className="grid-fields">
          <label className="field">
            <span>Mês inicial</span>
            <input
              id="start-month"
              type="month"
              value={state.startMonth}
              onChange={(e) => e.target.value && set({ startMonth: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Quantos meses</span>
            <select id="months" value={state.months} onChange={(e) => set({ months: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <WednesdayPicker
            id="anchor"
            label="O 1º rodízio foi na quarta"
            value={state.anchor}
            onChange={(anchor) => set({ anchor })}
          />
        </div>
        {table && (
          <p className="calc">
            A 1ª quarta de {MONTHS[firstDate.getMonth()]} ({formatDay(firstDate)}) cai no{' '}
            <b>{roundOf(firstDate) + 1}º rodízio</b>.
          </p>
        )}
        <p className="hint note">
          A escala é às quartas-feiras. Quando o mês tem 5ª quarta-feira, ela fica de fora e o rodízio continua na
          próxima. Para atualizar a escala, basta trocar o mês inicial: o rodízio continua de onde parou.
        </p>
      </section>

      <section className="panel">
        <h2>Servas</h2>
        <p className="hint">A posição na lista é o número da serva na tabela (1, 2, 3…).</p>
        <div className="senhoras-people">
          <PeopleEditor people={state.people} onChange={setPeople} emptyText="Nenhuma serva ainda" />
        </div>
        {n < MIN_SERVAS ? (
          <p className="status warn">Cadastre pelo menos {MIN_SERVAS} servas (palavra, louvor e preparo).</p>
        ) : isOfficial(n) ? (
          <p className="status ok">✓ Usando a tabela oficial para {n} servas.</p>
        ) : (
          <p className="status warn">
            O livro só tem tabelas de 3 a 12 servas. Para {n} servas, uso um rodízio equilibrado em que cada uma passa
            por todas as funções.
          </p>
        )}
        {table && (
          <details className="rotation-details">
            <summary>Ver tabela de rodízio</summary>
            <RotationTable table={table} people={state.people} current={roundOf(firstDate) + 1} />
          </details>
        )}
      </section>

      {table && (
        <section>
          <h2 className="preview-title">Escala</h2>
          <CycleSummary anchor={anchor} blocks={blocks} n={n} />
          <label className="check">
            <input
              id="show-rounds"
              type="checkbox"
              checked={state.showRoundsInImage}
              onChange={(e) => set({ showRoundsInImage: e.target.checked })}
            />
            Mostrar o número do rodízio (1º, 2º… ↻ 1º) em cada data da imagem
          </label>
          <p className="hint">Dica: clique num nome para trocar manualmente quem faz aquela função no dia.</p>
          <div className="cards">
            <Shareable
              fileName="escala-trabalho-de-senhoras.png"
              version={JSON.stringify(state)}
              render={(exporting) => (
                <SenhorasCard
                  blocks={blocks}
                  table={table}
                  people={state.people}
                  roundOf={roundOf}
                  showRounds={state.showRoundsInImage}
                  overrides={state.overrides}
                  onOverride={setOverride}
                  exporting={exporting}
                />
              )}
            />
          </div>
        </section>
      )}

      {listChange && (
        <ListChangeDialog
          from={listChange.from}
          to={listChange.to}
          suggested={toISO(firstDate)}
          onKeep={() => setListChange(null)}
          onRestart={(date) => {
            set({ anchor: date })
            setListChange(null)
          }}
        />
      )}
    </div>
  )
}
