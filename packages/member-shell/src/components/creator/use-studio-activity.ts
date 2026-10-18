'use client'

import { sessionFetch as fetch } from '@sistemazero/member-shell/lib/session-fetch'
import type { Project, StudioTaskSession } from '@sistemazero/studio'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import { reportClientError } from '../../lib/report-error'

export function useStudioActivity(
  _taskSession: StudioTaskSession | undefined,
  refreshOnLeave = true,
) {
  const router = useRouter()
  const routerRef = useRef(router)
  useEffect(() => {
    routerRef.current = router
  }, [router])
  const activityBeaconedRef = useRef(false)
  // O XP de criar já foi gravado e falta só a barra (foguinho/XP) mostrar: isso fica para
  // quando o editor SAI da tela.
  const refreshOnLeaveRef = useRef(false)
  const mountedRef = useRef(true)

  const handleActivity = useCallback(
    (_project: Project, ctx?: { reason: 'autosave' | 'flush' }) => {
      if (ctx?.reason !== 'autosave') return

      if (activityBeaconedRef.current) return
      activityBeaconedRef.current = true
      fetch('/api/studio/activity', { method: 'POST' })
        .then((response) => {
          if (!response.ok) return
          // Se o editor já saiu antes da resposta, não há jogo aberto a perder: atualiza agora.
          if (!refreshOnLeave) return
          if (mountedRef.current) refreshOnLeaveRef.current = true
          else routerRef.current.refresh()
        })
        .catch((error: unknown) =>
          reportClientError(error instanceof Error ? error : new Error(String(error))),
        )
    },
    [refreshOnLeave],
  )

  // ⚠️⚠️ NUNCA `router.refresh()` com o editor aberto. O jogo aberto vive só na memória do
  // host (a URL é `/estudio`), e o Next troca o refresh por um RECARREGAMENTO da página
  // quando a resposta não serve: o servidor foi atualizado depois que a aba abriu (build
  // diferente) ou a ida falhou. A criança caía em "Meus Jogos" no meio do que estava
  // fazendo, e a primeira edição real (instalar o Jogo 2D, por exemplo) era justamente o
  // gatilho. Saindo do editor (de volta à lista ou para outra página) não há nada a perder.
  // ⚠️ O editor também desmonta sem a criança sair do `/estudio` (o "Tentar de novo" da tarefa
  // do Pensa e o "Recriar projeto" mostram a tela de carregamento no lugar dele). Ali o refresh
  // ainda pode recarregar a página; é raro (pede XP gravado + essa troca + servidor novo) e a
  // aba volta para a mesma tarefa.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (refreshOnLeaveRef.current) routerRef.current.refresh()
    }
  }, [])

  return handleActivity
}
