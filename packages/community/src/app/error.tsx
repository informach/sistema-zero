'use client'

import { RotateCcw, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'
import { StatusScreen } from '@/components/community/status-screen'

/**
 * Página de erro da comunidade adulta (antes, uma falha mostrava a tela padrão do Next, em inglês).
 * "Tentar de novo" busca de novo o trecho que falhou, sem recarregar a página inteira. É o `retry`
 * do Next 16.3, e não o `reset`: este só redesenha com o que já veio do servidor, então uma falha
 * do servidor (o members fora ao carregar o layout) voltaria igual, sem pedido nenhum.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusScreen
      icon={TriangleAlert}
      title="Não foi possível abrir esta página"
      text="A falha foi do nosso lado. Tente de novo; se repetir, fale com a equipe pela página Ajuda."
    >
      <button type="button" onClick={() => retry()} className="sz-btn">
        <RotateCcw aria-hidden="true" />
        Tentar de novo
      </button>
      <Link href="/" className="sz-btn-outline">
        Ir para o início
      </Link>
    </StatusScreen>
  )
}
