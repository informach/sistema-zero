'use client'

import type { EditableStudioProject, StudioRuntimeEnvironment } from '@sistemazero/studio'
import { useEffect, useState } from 'react'
import { apiSend } from '../../lib/api'
import { sessionFetch } from '../../lib/session-fetch'

function message(error: unknown) {
  return error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : 'Não foi possível preparar o ambiente Python. Seu projeto continua preservado.'
}

/** Runs only after local/cloud admission has selected and confirmed the original lesson seed. */
export function useLessonRuntime(input: {
  project: EditableStudioProject | null
  userId?: string | null
  lessonId: string
  blockId: string
  baselineId?: string
  offline: boolean
}) {
  const { project, userId, lessonId, blockId, baselineId, offline } = input
  const [attempt, setAttempt] = useState(0)
  const key = `${userId ?? ''}:${lessonId}:${blockId}:${baselineId ?? ''}:${offline}:${attempt}`
  const [state, setState] = useState<{
    key: string
    project: EditableStudioProject
    environment?: StudioRuntimeEnvironment
    error?: string
  } | null>(null)
  useEffect(() => {
    if (project?.programmingLanguage !== 'python' || !userId || !lessonId || !baselineId || offline)
      return
    const controller = new AbortController()
    let releaseAuthority: (() => void) | undefined
    void import('@sistemazero/studio/lesson-runtime')
      .then(({ createLessonRuntimeEnvironment }) =>
        createLessonRuntimeEnvironment({
          project,
          scope: { userId, lessonId, blockId, baselineId },
          signal: controller.signal,
          languageRequest: sessionFetch,
          request: (input, signal) =>
            apiSend(
              `/api/members/lessons/${encodeURIComponent(lessonId)}/blocks/${encodeURIComponent(blockId)}/studio-runtime`,
              'POST',
              input,
              undefined,
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
              project,
              error: 'Seu acesso mudou. O projeto continua salvo. Tente reabrir o ambiente.',
            })
        }
        environment.signal?.addEventListener('abort', lost, { once: true })
        releaseAuthority = () => environment.signal?.removeEventListener('abort', lost)
        if (environment.signal?.aborted) lost()
        else setState({ key, project, environment })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ key, project, error: message(error) })
      })
    return () => {
      releaseAuthority?.()
      controller.abort()
    }
  }, [project, userId, lessonId, blockId, baselineId, offline, key])
  const current = state?.key === key && state.project === project ? state : null
  return {
    environment: current?.environment,
    error: current?.error,
    loading:
      project?.programmingLanguage === 'python' &&
      Boolean(userId && lessonId && baselineId) &&
      !offline &&
      !current,
    retry: () => setAttempt((value) => value + 1),
  }
}
