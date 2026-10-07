import { CalendarioAdmin } from './CalendarioAdmin'
import { CalendarioHome } from './CalendarioHome'
import { CalendarioView } from './CalendarioView'
import './calendario.css'

/**
 * Rotas do Calendário de Eventos (carregadas sob demanda, junto com o Firebase):
 * - #/calendario                  → área do secretário (login)
 * - #/calendario/admin/{id}       → administrar um calendário
 * - #/calendario/ver/{id}         → link público de visualização (sem login)
 */
export default function CalendarioRoutes({ path }: { path: string[] }) {
  if (path[0] === 'admin' && path[1]) return <CalendarioAdmin calendarId={path[1]} />
  if (path[0] === 'ver' && path[1]) return <CalendarioView calendarId={path[1]} />
  return <CalendarioHome />
}
