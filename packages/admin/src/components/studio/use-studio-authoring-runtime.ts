'use client'

import { studioProjectContinuityReference } from '@sistemazero/core/studio/project-continuity'
import type { StudioAuthoringRuntimeContext } from '@sistemazero/core/studio/runtime-authorization'
import type { EditableStudioProject, StudioRuntimeEnvironment } from '@sistemazero/studio'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { apiSend } from '../../lib/api'

export type StudioAuthoringRuntimeScope = { userId: string; context: StudioAuthoringRuntimeContext }

function errorMessage(error: unknown): string {
  return error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : 'Não foi possível preparar Python.'
}

/** Source edits keep the same interpreter; actor/draft/environment changes retire its authority. */
export function useStudioAuthoringRuntime(
  project: EditableStudioProject | null,
  scope?: StudioAuthoringRuntimeScope,
) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{
    key: string
    environment?: StudioRuntimeEnvironment
    error?: string
  } | null>(null)
  const owner =
    project?.programmingLanguage === 'python'
      ? { id: project.id, environment: studioProjectContinuityReference(project) }
      : null
  const key = JSON.stringify([owner, scope, attempt])
  const latest = useRef({ project, scope })
  useLayoutEffect(() => {
    latest.current = { project, scope }
  })
  useEffect(() => {
    const { project, scope } = latest.current
    if (project?.programmingLanguage !== 'python' || !scope) return
    const controller = new AbortController()
    let release: (() => void) | undefined
    void import('@sistemazero/studio/contextual-runtime')
      .then(({ createContextualRuntimeEnvironment }) =>
        createContextualRuntimeEnvironment({
          project,
          scope,
          signal: controller.signal,
          request: (candidate, signal) =>
            apiSend(
              '/api/members/studio/authoring-runtime',
              'POST',
              { ...candidate, context: scope.context },
              { signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]) },
            ),
        }),
      )
      .then((environment) => {
        if (controller.signal.aborted) return
        const lost = () => {
          if (!controller.signal.aborted)
            setState({
              key,
              error: 'O acesso ou a versão do rascunho mudou. O projeto foi preservado.',
            })
        }
        environment.signal?.addEventListener('abort', lost, { once: true })
        release = () => environment.signal?.removeEventListener('abort', lost)
        if (environment.signal?.aborted) lost()
        else setState({ key, environment })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ key, error: errorMessage(error) })
      })
    return () => {
      release?.()
      controller.abort()
    }
  }, [key])
  const current = state?.key === key ? state : null
  return {
    environment: current?.environment,
    error: current?.error,
    loading: Boolean(owner && scope && !current),
    retry: () => setAttempt((value) => value + 1),
  }
}
