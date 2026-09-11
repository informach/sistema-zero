'use client'

import { useEffect } from 'react'
import { KidsRecado } from '@/components/kids/kids-recado'
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

  // No molde das telas de recado, sem a pílula do motivo: foi a gente que tropeçou,
  // como no `KidsAccessUnavailable`.
  return (
    <KidsRecado
      art={<KidsMascot expression="thinking" className="kid-float size-24" />}
      title="Ops! Algo deu errado"
      actions={
        <button type="button" onClick={() => reset()} className="sz-btn-gradient px-6">
          Tentar de novo
        </button>
      }
    >
      <p>A gente tropeçou aqui. Tenta de novo? Costuma funcionar na segunda. 😊</p>
    </KidsRecado>
  )
}
