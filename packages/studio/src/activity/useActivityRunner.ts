import { useCallback } from 'react'
import { useChecksStore, useChecksStoreApi } from '../state/checksStore'
import { useProjectStoreApi } from '../state/projectStore'
import type { ActivityRunResult, LessonActivity } from '../studio/activity'
import { useStudioConfig } from '../studio/config'
import { runActivity } from './run'

export interface ActivityRunnerHandle {
  run: () => Promise<ActivityRunResult | null>
  running: boolean
  result: ActivityRunResult | null
}

/**
 * Orquestra a auto-correção no painel da atividade: lê o projeto ATUAL da store,
 * roda `runActivity` (structure no parent + sandbox oculto) com a política de
 * segurança do preview, e guarda o resultado na `checksStore` por instância (de
 * onde o `StudioHandle.getActivityResult()` lê no envio).
 */
export function useActivityRunner(activity: LessonActivity): ActivityRunnerHandle {
  const running = useChecksStore((s) => s.running)
  const result = useChecksStore((s) => s.lastResult)
  const checksApi = useChecksStoreApi()
  const projectApi = useProjectStoreApi()
  const previewSecurity = useStudioConfig().previewSecurity

  const run = useCallback(async (): Promise<ActivityRunResult | null> => {
    const project = projectApi.getState().project
    if (!project) return null
    const runProjectId = project.id
    checksApi.getState().setRunning(true)
    try {
      const r = await runActivity(project, activity, {
        fetchAllowedOrigins: previewSecurity.fetchAllowedOrigins,
        loopBudgetMs: previewSecurity.loopBudgetMs,
      })
      // O host pode ter trocado de projeto/aula (replaceProject / próxima aula)
      // DURANTE a verificação — o sandbox leva segundos. Não publicamos a nota da
      // rodada antiga sobre o projeto novo (vazaria a nota de A no envio de B). O
      // StudioCore já zera o lastResult ao (re)hidratar.
      if (projectApi.getState().project?.id !== runProjectId) return r
      checksApi.getState().setResult(r)
      return r
    } finally {
      checksApi.getState().setRunning(false)
    }
  }, [
    activity,
    checksApi,
    projectApi,
    previewSecurity.fetchAllowedOrigins,
    previewSecurity.loopBudgetMs,
  ])

  return { run, running, result }
}
