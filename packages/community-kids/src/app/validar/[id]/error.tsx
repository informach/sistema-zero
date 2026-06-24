'use client'

import { useEffect } from 'react'
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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <KidsMascot expression="thinking" className="size-24" />
      <div>
        <h1 className="sz-display text-2xl">Não foi possível validar agora</h1>
        <p className="mt-1 text-muted-foreground">
          Tivemos um tropeço ao conferir o certificado. Tenta de novo?
        </p>
      </div>
      <button type="button" onClick={() => reset()} className="sz-btn-gradient h-11 px-6 text-base">
        Tentar de novo
      </button>
    </main>
  )
}
