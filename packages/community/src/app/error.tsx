'use client'

import { RotateCcw } from 'lucide-react'
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
      art={<PixelMonitor />}
      title="Esta página tropeçou."
      text="A falha foi do nosso lado. Seus jogos estão guardados. Tente de novo em instantes e, se repetir, fale com a equipe pela Ajuda."
    >
      <button type="button" onClick={() => retry()} className="sz-btn">
        <RotateCcw aria-hidden="true" />
        Tentar de novo
      </button>
      <Link href="/ajuda" className="sz-btn-outline">
        Falar com a equipe
      </Link>
    </StatusScreen>
  )
}

/** O monitor em pixel com a cara de "ops", na cor laranja do palco. */
function PixelMonitor() {
  return (
    <svg viewBox="0 0 64 40" width="168" height="105" shapeRendering="crispEdges">
      <rect x="8" y="8" width="48" height="28" fill="var(--carta)" />
      <rect x="12" y="12" width="40" height="20" fill="var(--noite)" />
      <rect x="18" y="18" width="4" height="4" fill="var(--laranja)" />
      <rect x="42" y="18" width="4" height="4" fill="var(--laranja)" />
      <rect x="24" y="26" width="16" height="2" fill="var(--laranja)" />
      <rect x="28" y="36" width="8" height="4" fill="var(--linha-escura)" />
    </svg>
  )
}
