'use client'

import type { LiveWorkspaceView } from '@sistemazero/core/live'
import { STUDIO_PRO_BUILD_LIMITS } from '@sistemazero/core/studio/pro-limits'
import { studioProjectContinuityReference } from '@sistemazero/core/studio/project-continuity'
import type { StudioLiveRuntimeContext } from '@sistemazero/core/studio/runtime-authorization'
import type { EditableStudioProject, StudioProRuntimeAdapter } from '@sistemazero/studio'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createLiveProRuntime } from '../../lib/live/pro-runtime'

// Present even during admission/revocation: the editor must never choose WebContainer here.
const blocked: StudioProRuntimeAdapter = {
  limits: STUDIO_PRO_BUILD_LIMITS,
  signal: AbortSignal.abort(),
  build: async () => {
    throw new Error('Aguarde a autoria para executar o projeto.')
  },
}

export function useLiveProRuntime(input: {
  project: EditableStudioProject
  userId: string
  context: StudioLiveRuntimeContext | null
  enabled: boolean
  leaseExpiresAt: string | null
  queue: { current: Promise<void> }
  current(): LiveWorkspaceView
  save(): Promise<void>
}) {
  const pro = input.project.programmingLanguage !== 'python' && input.project.kind === 'pro'
  const active = pro && input.enabled && Boolean(input.context)
  const key = JSON.stringify([
    pro ? [input.project.id, studioProjectContinuityReference(input.project)] : null,
    input.userId,
    input.context,
    active,
  ])
  const latest = useRef(input)
  const authority = useRef<{ key: string; controller: AbortController } | null>(null)
  const [state, setState] = useState<{ key: string; adapter: StudioProRuntimeAdapter } | null>(null)
  useLayoutEffect(() => {
    latest.current = input
  })
  const invalidate = useCallback(() => authority.current?.controller.abort(), [])
  useEffect(() => {
    const current = latest.current
    if (!active || !current.context) return
    const controller = new AbortController()
    authority.current = { key, controller }
    const adapter = createLiveProRuntime({
      context: current.context,
      userId: current.userId,
      signal: controller.signal,
      queue: current.queue,
      current: () => latest.current.current(),
      save: () => latest.current.save(),
    })
    setState({ key, adapter })
    return () => {
      controller.abort()
      if (authority.current?.controller === controller) authority.current = null
    }
  }, [key, active])
  useEffect(() => {
    if (!active) return
    const until = Date.parse(input.leaseExpiresAt ?? '')
    const expire = () => {
      if (authority.current?.key === key) authority.current.controller.abort()
    }
    if (!Number.isFinite(until) || until <= Date.now()) {
      expire()
      return
    }
    const timer = setTimeout(expire, until - Date.now())
    return () => clearTimeout(timer)
  }, [key, active, input.leaseExpiresAt])
  return {
    adapter: pro ? (state?.key === key ? state.adapter : blocked) : undefined,
    invalidate,
  }
}
