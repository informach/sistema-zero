'use client'

import { studioProjectContinuityReference } from '@sistemazero/core/studio/project-continuity'
import type { EditableStudioProject, StudioRuntimeEnvironment } from '@sistemazero/studio'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { apiSend } from '../../lib/api'
import { sessionFetch } from '../../lib/session-fetch'

/** Local saves do not change runtime ownership. Actor/project/environment changes do. */
export function useFreeStudioRuntime(input: {
  project: EditableStudioProject | null
  viewerId: string | null
  audience?: 'kids' | 'adult'
  enabled?: boolean
}) {
  const [attempt, setAttempt] = useState(0)
  const active =
    input.enabled !== false &&
    input.project?.programmingLanguage === 'python' &&
    Boolean(input.viewerId)
  const key = JSON.stringify([
    input.viewerId,
    input.audience ?? 'kids',
    active,
    input.project?.programmingLanguage === 'python'
      ? { id: input.project.id, environment: studioProjectContinuityReference(input.project) }
      : null,
    attempt,
  ])
  const owner = useMemo(() => ({ key }), [key])
  const latest = useRef(input)
  const authority = useRef<{ owner: typeof owner; controller: AbortController } | null>(null)
  const [state, setState] = useState<{
    owner: typeof owner
    environment?: StudioRuntimeEnvironment
    error?: string
  } | null>(null)
  useLayoutEffect(() => {
    latest.current = input
  })
  useLayoutEffect(
    () => () => {
      if (authority.current?.owner === owner) authority.current.controller.abort()
    },
    [owner],
  )
  useEffect(() => {
    const { project, viewerId } = latest.current
    if (!active || project?.programmingLanguage !== 'python' || !viewerId) return
    const controller = new AbortController()
    authority.current = { owner, controller }
    const context = {
      kind: 'free' as const,
      audience: latest.current.audience ?? 'kids',
      projectId: project.id,
    }
    let release: (() => void) | undefined
    void import('@sistemazero/studio/contextual-runtime')
      .then(({ createContextualRuntimeEnvironment }) =>
        createContextualRuntimeEnvironment({
          project,
          scope: { userId: viewerId, context },
          signal: controller.signal,
          language: { context: () => context, request: sessionFetch },
          request: (candidate, signal) =>
            apiSend('/api/studio/free-runtime', 'POST', { ...candidate, context }, undefined, {
              signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
            }),
        }),
      )
      .then((environment) => {
        if (controller.signal.aborted) return
        const lost = () => {
          if (!controller.signal.aborted)
            setState({
              owner,
              error: 'O acesso ao Estúdio mudou. Seu projeto continua preservado.',
            })
        }
        environment.signal?.addEventListener('abort', lost, { once: true })
        release = () => environment.signal?.removeEventListener('abort', lost)
        if (environment.signal?.aborted) lost()
        else setState({ owner, environment })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            owner,
            error:
              error &&
              typeof error === 'object' &&
              'message' in error &&
              typeof error.message === 'string'
                ? error.message
                : 'Não foi possível preparar Python. Seu projeto continua preservado.',
          })
      })
    return () => {
      release?.()
      controller.abort()
      if (authority.current?.controller === controller) authority.current = null
    }
  }, [owner, active])
  const current = state?.owner === owner ? state : null
  return {
    environment: current?.environment?.signal?.aborted ? undefined : current?.environment,
    error: current?.error,
    loading: active && !current,
    retry: useCallback(() => setAttempt((value) => value + 1), []),
  }
}
