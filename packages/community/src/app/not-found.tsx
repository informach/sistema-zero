import Link from 'next/link'
import { StatusScreen } from '@/components/community/status-screen'

/** Página 404 da comunidade adulta, com três caminhos para seguir. */
export default function NotFound() {
  return (
    <StatusScreen
      big="404"
      title="Página não encontrada"
      text="O endereço que você acessou não existe ou foi movido. Escolha um dos caminhos abaixo."
    >
      <Link href="/" className="sz-btn">
        Ir para o início
      </Link>
      <Link href="/cursos" className="sz-btn-outline">
        Ver os cursos
      </Link>
      <Link href="/ajuda" className="sz-btn-outline">
        Ajuda
      </Link>
    </StatusScreen>
  )
}
