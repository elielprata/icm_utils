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
    href: '#/cias-evento',
    title: 'Evento das CIAs',
    description: 'Evangelização, Seminário…: Palavra e Louvor de todas as turmas numa imagem só.',
    image: ciasBanner,
    logo: ciasLogo,
    badge: '🎉 Evento',
  },
  {
    href: '#/senhoras',
    title: 'Escala do Trabalho de Senhoras',
    description: 'Palavra, louvor e preparo às quartas-feiras, pela tabela oficial.',
    image: senhorasBanner,
  },
  {
    href: '#/oracao',
    title: 'Oração Ininterrupta',
    description: 'Lista de 24 horas com várias igrejas: cada igreja recebe seu link de inscrição.',
    art: '24h',
  },
]

export function Home() {
  return (
    <div className="app">
      <header className="home-header">
        <h1>Organização e Escalas</h1>
        <p className="hint">Escolha o que você quer organizar.</p>
      </header>

      <nav className="tools">
        {TOOLS.map((t) => (
          <a key={t.href} className="tool" href={t.href}>
            <div className="tool-image">
              {t.image ? <img src={t.image} alt="" /> : <span className="tool-art">{t.art}</span>}
              {t.logo && <img className="tool-logo" src={t.logo} alt="" />}
              {t.badge && <span className="tool-badge">{t.badge}</span>}
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
