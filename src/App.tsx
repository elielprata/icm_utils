import { useEffect, useState, type ComponentType } from 'react'
import { Home } from './pages/Home'
import { CiasPage } from './pages/CiasPage'
import { SenhorasPage } from './pages/SenhorasPage'

// Rotas por hash (#/cias), que funcionam no GitHub Pages sem configuração extra.
const PAGES: Record<string, ComponentType> = {
  '#/cias': CiasPage,
  '#/senhoras': SenhorasPage,
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

  const Page = PAGES[route] ?? Home
  return <Page />
}
