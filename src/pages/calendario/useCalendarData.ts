import { useEffect, useState } from 'react'
import { watchCalendar, watchCalendarEvents, type Calendar, type CalendarEvent } from '../../lib/calendario'

/** Calendário + eventos, atualizados ao vivo. `calendar` é `undefined` enquanto carrega e `null` se não existe. */
export function useCalendarData(calendarId: string) {
  const [calendar, setCalendar] = useState<Calendar | null | undefined>(undefined)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fail = (e: Error) => setError(e.message)
    const stopCalendar = watchCalendar(calendarId, setCalendar, fail)
    const stopEvents = watchCalendarEvents(calendarId, setEvents, fail)
    return () => {
      stopCalendar()
      stopEvents()
    }
  }, [calendarId])

  return { calendar, events, error }
}
