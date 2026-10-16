'use client'

import { PrivateZappyVoice } from '@sistemazero/member-shell/components/private-zappy-voice'
import { sessionFetch as fetch } from '@sistemazero/member-shell/lib/session-fetch'
import type { StudioTaskSession } from '@sistemazero/studio'
import { useEffect, useMemo, useRef } from 'react'
import type { CreationsCloud } from '../../lib/creations-cloud'
import { cloudConfirmRefusal, guideError, progressRefusal } from '../../lib/pensa-guide-errors'
import { withProvisionalGameLink } from '../../lib/pensa-mission-link'
import { navigatePensaMission, resolveNextPensaMission } from '../../lib/pensa-next-mission'
import { useNextMissionLabel } from './use-next-mission-label'
import { usePensaGuideCollapsed } from './use-pensa-guide-collapsed'
import type { StudioTaskHandoff, StudioTaskProgressUpdate } from './use-pensa-task-handoff'

/** The same saved-evidence and concurrency contract in both Studio modes. */
export function useStudioTaskSession({
  handoff,
  projectId,
  viewerId,
  cloud,
  retry,
  updateProgress,
  navigate,
  narrationEnabled = false,
  pro = false,
}: {
  handoff: StudioTaskHandoff | null
  projectId: string | null
  viewerId: string | null
  cloud: CreationsCloud | null
  retry: () => void
  updateProgress: (progress: StudioTaskProgressUpdate) => void
  navigate: (path: string) => void
  narrationEnabled?: boolean
  pro?: boolean
}): StudioTaskSession | undefined {
  const sessionScope = useMemo(
    () => ({
      cloud,
      projectId,
      viewerId,
      taskId: handoff?.task.id,
      revision: handoff?.task.revision,
      owned: handoff?.capability.owned,
    }),
    [
      cloud,
      projectId,
      viewerId,
      handoff?.task.id,
      handoff?.task.revision,
      handoff?.capability.owned,
    ],
  )
  const currentScope = useRef(sessionScope)
  currentScope.current = sessionScope
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const { collapsed, setCollapsed } = usePensaGuideCollapsed(viewerId)
  const nextMissionLabel = useNextMissionLabel({
    enabled:
      handoff?.task.guide.contractVersion === 2 && handoff.task.progress.status === 'completed',
    taskId: handoff?.task.id ?? null,
    projectId: handoff?.project.id ?? null,
    current: 'studio',
  })
  return useMemo(() => {
    if (!handoff || !projectId || !handoff.capability.owned) return undefined
    const assertCurrent = () => {
      if (!mounted.current || currentScope.current !== sessionScope)
        throw guideError('O perfil, projeto ou missão mudou. Abra a missão atual para continuar.')
    }
    const confirm = async () => {
      assertCurrent()
      if (!cloud) throw guideError('Espere seu jogo ficar guardado na conta.')
      await cloud.confirm(projectId, { timeoutMs: 15000 }).catch((cause: unknown) => {
        throw cloudConfirmRefusal(cause, 'Seu jogo')
      })
      assertCurrent()
      const saved = await cloud.peek(projectId)
      assertCurrent()
      if (!saved) throw guideError('Seu jogo ainda não foi guardado na conta.')
      return String(saved.summary.revision)
    }
    return {
      taskId: handoff.task.id,
      title: handoff.task.title,
      summary: handoff.task.summary,
      project: handoff.project,
      cycle: handoff.cycle,
      guide: handoff.task.guide,
      codeTransition: pro && handoff.task.context.authoring !== 'code',
      blocks: pro ? [] : handoff.task.context.blocks,
      progress: withProvisionalGameLink(
        handoff.task.progress,
        handoff.task.guide.contractVersion === 2,
        projectId,
      ),
      collapsed,
      onCollapsedChange: setCollapsed,
      nextMissionLabel,
      renderListen:
        narrationEnabled && viewerId && (!pro || handoff.task.context.authoring === 'code')
          ? (stepId) => (
              <PrivateZappyVoice
                viewerId={viewerId}
                reference={{
                  origin: 'pensa_guide',
                  taskId: handoff.task.id,
                  revision: handoff.task.revision,
                  stepId,
                }}
              />
            )
          : undefined,
      onNeedHelp: () => {
        assertCurrent()
        navigate(`/pensa?plano=${encodeURIComponent(handoff.project.id)}`)
      },
      onNextMission: async () => {
        await confirm()
        const next = await resolveNextPensaMission(handoff.project.id).catch(() => {
          throw guideError('Não consegui abrir a próxima missão. Tente de novo.')
        })
        assertCurrent()
        navigatePensaMission(next.path, navigate)
      },
      onProgress: async (input) => {
        assertCurrent()
        if (handoff.task.guide.contractVersion === 2 && input.status === 'completed') {
          input = {
            ...input,
            outputRef: {
              kind: 'studio_project',
              projectId,
              saveRevision: await confirm(),
            },
          }
        }
        assertCurrent()
        const response = await fetch(
          `/api/pensa/tasks/${encodeURIComponent(handoff.task.id)}/progress`,
          {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ...input, expectedUpdatedAt: handoff.task.progress.updatedAt }),
          },
        )
        const body = (await response.json().catch(() => null)) as {
          task?: { progress: StudioTaskProgressUpdate }
          error?: { code?: string; message?: string }
        } | null
        assertCurrent()
        if (response.status === 409) {
          retry()
          throw progressRefusal(409, {
            error: {
              code: body?.error?.code ?? 'PENSA_TASK_PROGRESS_CONFLICT',
              message: body?.error?.message,
            },
          })
        }
        if (!response.ok || !body?.task) throw progressRefusal(response.status, body)
        updateProgress(body.task.progress)
      },
    }
  }, [
    handoff,
    projectId,
    viewerId,
    cloud,
    retry,
    updateProgress,
    navigate,
    narrationEnabled,
    pro,
    collapsed,
    setCollapsed,
    nextMissionLabel,
    sessionScope,
  ])
}
