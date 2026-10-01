import { OracaoAdmin } from './OracaoAdmin'
import { OracaoHome } from './OracaoHome'
import { OracaoSignup } from './OracaoSignup'
import './oracao.css'

/**
 * Rotas da Oração Ininterrupta (carregadas sob demanda, junto com o Firebase):
 * - #/oracao                    → área do coordenador
 * - #/oracao/admin/{período}    → administrar um período
 * - #/oracao/{período}/{igreja} → inscrição pelo link da igreja
 */
export default function OracaoRoutes({ path }: { path: string[] }) {
  if (path[0] === 'admin' && path[1]) return <OracaoAdmin periodId={path[1]} />
  if (path.length >= 2) return <OracaoSignup periodId={path[0]} churchCode={path[1]} />
  return <OracaoHome />
}
