'use client'

import type { LiveWorkspaceView } from '@sistemazero/core/live'
import { studioProjectContinuityReference } from '@sistemazero/core/studio/project-continuity'
import type { StudioLiveRuntimeContext } from '@sistemazero/core/studio/runtime-authorization'
import type { EditableStudioProject, StudioRuntimeEnvironment } from '@sistemazero/studio'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { liveStudioAnalysisContext, requestLiveStudioRuntime } from '../../lib/live/studio-runtime'

/** Writer changes retire authority; autosave and lease renewal keep the same interpreter. */
export function useLiveStudioRuntime(input: {
  project: EditableStudioProject
  userId: string
  context: StudioLiveRuntimeContext | null
  enabled: boolean
  /** Observation opens only the parser. Executing still requires enabled writer authority. */
  observe?: boolean
  leaseExpiresAt: string | null
  queue: { current: Promise<void> }
  current(): LiveWorkspaceView
}) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{
    key: string
    environment?: StudioRuntimeEnvironment
    error?: string
  } | null>(null)
  const owner =
    input.project.programmingLanguage === 'python'
      ? { id: input.project.id, environment: studioProjectContinuityReference(input.project) }
      : null
  const active = Boolean(owner && (input.enabled || input.observe) && input.context)
  const key = JSON.stringify([owner, input.userId, input.context, active, input.enabled, attempt])
  const latest = useRef(input)
  const authority = useRef<{ key: string; controller: AbortController } | null>(null)
  const invalidate = useCallback(() => {
    const current = authority.current
    if (!current || current.controller.signal.aborted) return
    current.controller.abort()
    setState({
      key: current.key,
      error: 'A autoria ou o acesso mudou. Seu projeto continua preservado.',
    })
  }, [])
  useLayoutEffect(() => {
    latest.current = input
  })
  useEffect(() => {
    const current = latest.current
    const context = current.context
    const project = current.project
    if (!active || !context || project.programmingLanguage !== 'python') return
    const controller = new AbortController()
    authority.current = { key, controller }
    let release: (() => void) | undefined
    void import('@sistemazero/studio/contextual-runtime')
      .then(({ createContextualRuntimeEnvironment }) =>
        createContextualRuntimeEnvironment({
          project,
          scope: { userId: current.userId, context },
          signal: controller.signal,
          language: liveStudioAnalysisContext({
            context,
            userId: current.userId,
            signal: controller.signal,
            access: current.enabled ? 'author' : 'observer',
            queue: current.queue,
            current: () => latest.current.current(),
          }),
          request: (candidate, signal) =>
            requestLiveStudioRuntime({
              candidate,
              context,
              userId: current.userId,
              signal,
              access: current.enabled ? 'author' : 'observer',
              queue: current.queue,
              current: () => latest.current.current(),
            }),
        }),
      )
      .then((environment) => {
        if (controller.signal.aborted) return
        const lost = () => {
          if (!controller.signal.aborted)
            setState({
              key,
              error: 'A autoria ou o acesso mudou. Seu projeto continua preservado.',
            })
        }
        environment.signal?.addEventListener('abort', lost, { once: true })
        release = () => environment.signal?.removeEventListener('abort', lost)
        if (environment.signal?.aborted) lost()
        else setState({ key, environment })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            key,
            error: error instanceof Error ? error.message : 'Não foi possível preparar Python.',
          })
      })
    return () => {
      release?.()
      controller.abort()
      if (authority.current?.controller === controller) authority.current = null
    }
  }, [key, active])
  useEffect(() => {
    if (!active || !input.enabled) return
    const until = Date.parse(input.leaseExpiresAt ?? '')
    const expire = () => {
      if (authority.current?.key !== key) return
      authority.current.controller.abort()
      setState({ key, error: 'A autoria neste aparelho expirou. Seu projeto continua preservado.' })
    }
    if (!Number.isFinite(until) || until <= Date.now()) {
      expire()
      return
    }
    const timer = setTimeout(expire, until - Date.now())
    return () => clearTimeout(timer)
  }, [key, active, input.enabled, input.leaseExpiresAt])
  const current = state?.key === key ? state : null
  return {
    environment: current?.environment,
    error: current?.error,
    loading: active && !current,
    invalidate,
    retry: () => setAttempt((value) => value + 1),
  }
}
