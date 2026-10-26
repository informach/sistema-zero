'use client'

import type { EditableStudioProject, StudioRuntimeEnvironment } from '@sistemazero/studio'
import { useEffect, useState } from 'react'
import { apiSend } from '../../lib/api'

export interface StudioMasteryReviewScope {
  userId: string
  submissionId: string
}

/** The evidence object is immutable; changing actor/submission retires the running interpreter. */
export function useStudioMasteryReviewRuntime(
  project: EditableStudioProject | null,
  scope?: StudioMasteryReviewScope,
) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{
    project: EditableStudioProject
    key: string
    environment?: StudioRuntimeEnvironment
    error?: string
  } | null>(null)
  const userId = scope?.userId
  const submissionId = scope?.submissionId
  const key = JSON.stringify([userId, submissionId, attempt])
  useEffect(() => {
    if (project?.programmingLanguage !== 'python' || !userId || !submissionId) return
    const controller = new AbortController()
    let release: (() => void) | undefined
    void import('@sistemazero/studio/mastery-review-runtime')
      .then(({ createMasteryReviewPythonRuntimeEnvironment }) =>
        createMasteryReviewPythonRuntimeEnvironment({
          project,
          userId,
          submissionId,
          signal: controller.signal,
          request: (input, signal) =>
            apiSend('/api/members/studio/mastery-review-runtime', 'POST', input, {
              // Gallery review verifies the retained source and image parts before
              // authorization; allow the server's bounded 50-second read to finish.
              signal: AbortSignal.any([signal, AbortSignal.timeout(60_000)]),
            }),
        }),
      )
      .then((environment) => {
        if (controller.signal.aborted) return
        const lost = () => {
          if (!controller.signal.aborted)
            setState({ project, key, error: 'A autorização de revisão mudou. Reabra a entrega.' })
        }
        environment.signal?.addEventListener('abort', lost, { once: true })
        release = () => environment.signal?.removeEventListener('abort', lost)
        if (environment.signal?.aborted) lost()
        else setState({ project, key, environment })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            project,
            key,
            error:
              error instanceof Error
                ? error.message
                : 'Não foi possível preparar a revisão Python.',
          })
      })
    return () => {
      release?.()
      controller.abort()
    }
  }, [project, userId, submissionId, key])
  const current = state?.project === project && state.key === key ? state : null
  return {
    environment: current?.environment,
    error: current?.error,
    loading: Boolean(project?.programmingLanguage === 'python' && scope && !current),
    retry: () => setAttempt((value) => value + 1),
  }
}
