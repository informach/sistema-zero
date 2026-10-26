import Link from 'next/link'
import { StatusScreen } from '@/components/community/status-screen'

/** Página 404 da comunidade adulta, com três caminhos para seguir. */
export default function NotFound() {
  return (
    <StatusScreen
      big="404"
      title="Esta página saiu do mapa."
      text="O endereço não existe ou mudou de lugar. Escolha um caminho para continuar."
    >
      <Link href="/" className="sz-btn">
        Ir para o Início
      </Link>
      <Link href="/cursos" className="sz-btn-outline">
        Ver os cursos
      </Link>
      <Link href="/ajuda" className="sz-link inline-flex min-h-14 items-center px-3">
        Ajuda
      </Link>
    </StatusScreen>
  )
}
