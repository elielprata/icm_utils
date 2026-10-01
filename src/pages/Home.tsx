import ciasBanner from '../assets/fundo-area-kids-site.webp'
import ciasLogo from '../assets/logo-cias.webp'
import senhorasBanner from '../assets/senhoras-banner.webp'

const TOOLS = [
  {
    href: '#/cias',
    title: 'Escala das CIAs',
    description: 'Professores das classes infantis, em rodízio aos domingos.',
    image: ciasBanner,
    logo: ciasLogo,
  },
  {
    href: '#/senhoras',
    title: 'Escala do Trabalho de Senhoras',
    description: 'Palavra, louvor e preparo às quartas-feiras, pela tabela oficial.',
    image: senhorasBanner,
  },
]

export function Home() {
  return (
    <div className="app">
      <header className="home-header">
        <h1>Utilidades da Igreja</h1>
        <p className="hint">Escolha o que você quer organizar.</p>
      </header>

      <nav className="tools">
        {TOOLS.map((t) => (
          <a key={t.href} className="tool" href={t.href}>
            <div className="tool-image">
              <img src={t.image} alt="" />
              {t.logo && <img className="tool-logo" src={t.logo} alt="" />}
            </div>
            <div className="tool-text">
              <strong>{t.title}</strong>
              <span>{t.description}</span>
            </div>
          </a>
        ))}
      </nav>
    </div>
  )
}
