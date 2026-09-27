'use client'

import { useEffect } from 'react'
import { KidsRecado } from '@/components/kids/kids-recado'
import { KIDS_SCREEN_BAND } from '@/components/kids/kids-screen'
import { KidsMascot } from '@/components/kids/mascot'
import { reportClientError } from '@/lib/report-error'

/**
 * Error boundary da página PÚBLICA `/validar/[id]` (sem login, aberta por QR — quem
 * confere costuma ser um adulto: escola, responsável, empregador). O fetch da validação
 * é fail-soft (não lança), mas um throw em RENDER cairia no `global-error` da raiz; aqui
 * dá um recado neutro + "tentar de novo" e leva o crash ao Sentry (mesmo padrão do
 * `/jogar/[id]`). Renderiza dentro do root layout (globals aplicados).
 */
export default function ValidarError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Rota anônima → sem sessão, mas o beacon `/api/client-error` é same-origin e
    // sem gate de sessão: o crash chega ao Sentry mesmo aqui.
    console.error(error)
    reportClientError(error)
  }, [error])

  return (
    <main className="flex min-h-dvh flex-col">
      <KidsRecado
        bandClassName={KIDS_SCREEN_BAND}
        art={<KidsMascot expression="thinking" className="size-24" />}
        title="Não foi possível validar agora"
        actions={
          <button type="button" onClick={() => reset()} className="sz-btn-gradient px-6">
            Tentar de novo
          </button>
        }
      >
        <p>Tivemos um tropeço ao conferir o certificado. Tenta de novo?</p>
      </KidsRecado>
    </main>
  )
}
