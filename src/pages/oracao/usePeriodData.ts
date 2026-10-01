import { useEffect, useState } from 'react'
import { watchEntries, watchPeriod, type Entry, type Period } from '../../lib/oracao'

/** Período + inscrições, atualizados ao vivo. `period` é `undefined` enquanto carrega e `null` se não existe. */
export function usePeriodData(periodId: string) {
  const [period, setPeriod] = useState<Period | null | undefined>(undefined)
  const [entries, setEntries] = useState<Entry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fail = (e: Error) => setError(e.message)
    const stopPeriod = watchPeriod(periodId, setPeriod, fail)
    const stopEntries = watchEntries(periodId, setEntries, fail)
    return () => {
      stopPeriod()
      stopEntries()
    }
  }, [periodId])

  return { period, entries, error }
}
