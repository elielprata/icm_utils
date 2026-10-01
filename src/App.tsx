import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'
import { Home } from './pages/Home'
import { CiasPage } from './pages/CiasPage'
import { CiasEventoPage } from './pages/CiasEventoPage'
import { SenhorasPage } from './pages/SenhorasPage'

// Carrega a Oração (e o Firebase) só quando alguém abre essa parte.
const OracaoRoutes = lazy(() => import('./pages/oracao'))

// Rotas por hash (#/cias), que funcionam no GitHub Pages sem configuração extra.
const PAGES: Record<string, ComponentType> = {
  cias: CiasPage,
  'cias-evento': CiasEventoPage,
  senhoras: SenhorasPage,
}

export default function App() {
  const [route, setRoute] = useState(location.hash)

  useEffect(() => {
    const onChange = () => {
      setRoute(location.hash)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const [section, ...rest] = route.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (section === 'oracao') {
    return (
      <Suspense fallback={<p className="hint app">Carregando…</p>}>
        <OracaoRoutes path={rest} />
      </Suspense>
    )
  }
  const Page = PAGES[section] ?? Home
  return <Page />
}
