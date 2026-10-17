'use client'

import type { StudioTeamLibraryAdapter } from '@sistemazero/studio'
import { useEffect, useMemo, useState } from 'react'
import { pensaPlanIdFromStudioProjectId } from '@/lib/pensa-studio-link'
import { createPensaTeamLibrary, pensaTeamArtAvailable } from '@/lib/pensa-team-library'

/** Releitura enquanto o botão ainda não apareceu (a colega pode entregar com o jogo aberto). */
const RECHECK_MS = 60_000
/** Voltar à aba confere de novo, mas não a cada piscada de foco. */
const FOCUS_THROTTLE_MS = 15_000

/**
 * O "Trazer da equipe" do Estúdio Completo (Pensa em equipe, 14/10/2026).
 *
 * Só para o jogo de um plano do Pensa (`pensa-<32 hex>`), e só quando o servidor confirma que é
 * um plano EM EQUIPE, que a criança é quem PROGRAMA e que já há arte entregue por outra pessoa
 * (`pensaTeamArtAvailable`). Sem isso, `undefined`: nem o botão aparece.
 *
 * O editor abre NA HORA (nada de esperar a rede para mostrar o jogo): o adapter chega depois,
 * quando a resposta vem, e o Estúdio o recebe sem latch (ver o `teamLibrary` do StudioCore).
 * Enquanto não apareceu, a conferência se repete ao voltar à aba e a cada minuto com a aba à
 * vista, porque a colega pode concluir a missão de arte com o jogo aberto. Depois de aparecer,
 * FICA (some só ao trocar de jogo): a lista da janela é que acompanha o servidor.
 */
export function usePensaTeamLibrary(input: {
  projectId: string | null
  viewerId: string | null
}): StudioTeamLibraryAdapter | undefined {
  const { projectId, viewerId } = input
  const planId = projectId ? pensaPlanIdFromStudioProjectId(projectId) : null
  const scope = JSON.stringify([planId, viewerId])
  const adapter = useMemo(
    () => (planId ? createPensaTeamLibrary({ planId, viewerId }) : null),
    [planId, viewerId],
  )
  const [availableFor, setAvailableFor] = useState<string | null>(null)

  useEffect(() => {
    if (!planId) return
    let active = true
    let found = false
    let checking = false
    let lastCheck = 0
    const check = () => {
      if (found || checking || !active) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      checking = true
      lastCheck = Date.now()
      void pensaTeamArtAvailable(planId, viewerId)
        .then((ok) => {
          if (!active || !ok) return
          found = true
          setAvailableFor(scope)
        })
        .finally(() => {
          checking = false
        })
    }
    const onFocus = () => {
      if (Date.now() - lastCheck >= FOCUS_THROTTLE_MS) check()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onFocus()
    }
    check()
    const timer = setInterval(check, RECHECK_MS)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [planId, scope, viewerId])

  return adapter && availableFor === scope ? adapter : undefined
}
