'use client'

import { useEffect } from 'react'
import { KidsMascot } from '@/components/kids/mascot'
import { reportClientError } from '@/lib/report-error'

/**
 * Error boundary da área do aluno (grupo `(app)`): um throw em RENDER (RSC ou
 * client) que escaparia para a tela branca crua do Next cai aqui — tom kids
 * (mascote + Baloo + botão "tentar de novo") em vez de uma página assustadora
 * para crianças de 8–13. Renderiza DENTRO do root layout (globals/fontes aplicadas).
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // O `onRequestError` da instrumentation só vê erros de SERVIDOR; um throw em
    // render no CLIENTE escapa da telemetria. O beacon `/api/client-error` espelha
    // este erro p/ o Sentry (com redação de PII). `console.error` segue p/ o devtools.
    console.error(error)
    reportClientError(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <KidsMascot expression="thinking" className="size-24" />
      <div>
        <h1 className="sz-display text-2xl">Ops! Algo deu errado</h1>
        <p className="mt-1 text-muted-foreground">
          A gente tropeçou aqui. Tenta de novo? Costuma funcionar na segunda. 😊
        </p>
      </div>
      <button type="button" onClick={() => reset()} className="sz-btn-gradient h-11 px-6 text-base">
        Tentar de novo
      </button>
    </div>
  )
}
