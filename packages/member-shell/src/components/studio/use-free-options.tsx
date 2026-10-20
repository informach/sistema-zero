'use client'

import type { prepareStudioFreeOptions } from '@sistemazero/studio/free-project-options'
import type { PythonProjectDocument } from '@sistemazero/studio/python-project-validation'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiSend } from '../../lib/api'

type Prepared = Awaited<ReturnType<typeof prepareStudioFreeOptions>>

async function readOptions(signal: AbortSignal) {
  const raw = await apiGet<unknown>('/api/studio/free-options', undefined, { signal })
  const { prepareStudioFreeOptions } = await import('@sistemazero/studio/free-project-options')
  const options = await prepareStudioFreeOptions(raw)
  signal.throwIfAborted()
  return options
}

/** Discovery never blocks the legacy JS gallery; creation rechecks the current host catalog. */
export function useFreeStudioOptions(
  viewerId: string | null,
  enabled = true,
  audience: 'kids' | 'adult' = 'kids',
) {
  const [attempt, setAttempt] = useState(0)
  const owner = useMemo(
    () => ({ viewerId, enabled, audience, attempt }),
    [viewerId, enabled, audience, attempt],
  )
  const currentOwner = useRef(owner)
  const authority = useRef<{ owner: typeof owner; controller: AbortController } | null>(null)
  const [state, setState] = useState<{
    owner: typeof owner
    prepared?: Prepared
    error?: string
  } | null>(null)
  useLayoutEffect(() => {
    currentOwner.current = owner
    return () => authority.current?.controller.abort()
  }, [owner])
  useEffect(() => {
    if (!viewerId || !enabled) return
    const controller = new AbortController()
    authority.current = { owner, controller }
    void readOptions(controller.signal)
      .then((prepared) => {
        if (!controller.signal.aborted) setState({ owner, prepared })
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({ owner, error: 'Não foi possível consultar os ambientes Python.' })
      })
    return () => {
      controller.abort()
      if (authority.current?.controller === controller) authority.current = null
    }
  }, [owner, viewerId, enabled])
  const prepare = useCallback(
    async (selection: { kind: 'classic' | 'pro'; environmentKey: string }) => {
      const active = authority.current
      if (currentOwner.current !== owner || active?.owner !== owner)
        throw new Error('O perfil mudou. Reabra a criação do projeto.')
      const prepared = await readOptions(active.controller.signal)
      if (currentOwner.current !== owner)
        throw new Error('O perfil mudou. Reabra a criação do projeto.')
      setState({ owner, prepared })
      const environment = prepared.environments.find(
        ({ key, kind }) => key === selection.environmentKey && kind === selection.kind,
      )
      if (!environment)
        throw new Error('Este ambiente não está mais disponível para novos projetos.')
      return environment.context
    },
    [owner],
  )
  const current = state?.owner === owner ? state : null
  const authorizeExample = useCallback(
    async (project: PythonProjectDocument, signal: AbortSignal) => {
      const active = authority.current
      if (!owner.viewerId || currentOwner.current !== owner || active?.owner !== owner)
        throw new Error('O perfil mudou. Reabra a criação do projeto.')
      const lifetime = AbortSignal.any([signal, active.controller.signal])
      lifetime.throwIfAborted()
      const prepared = await readOptions(lifetime)
      lifetime.throwIfAborted()
      if (currentOwner.current !== owner)
        throw new Error('O perfil mudou. Reabra a criação do projeto.')
      const { authorizePythonPrivateCopy } = await import('../../lib/studio-python-remix')
      lifetime.throwIfAborted()
      await authorizePythonPrivateCopy({
        snapshot: project,
        viewerId: owner.viewerId,
        audience: owner.audience,
        options: prepared.options,
        signal: lifetime,
        request: (request) =>
          apiSend('/api/studio/free-runtime', 'POST', request, undefined, { signal: lifetime }),
      })
      lifetime.throwIfAborted()
      if (currentOwner.current !== owner)
        throw new Error('O perfil mudou. Reabra a criação do projeto.')
    },
    [owner],
  )
  return {
    creation: current?.prepared
      ? {
          environments: current.prepared.environments,
          prepare,
          authorizeExample,
          signal:
            authority.current?.owner === owner ? authority.current.controller.signal : undefined,
        }
      : undefined,
    curation: current?.prepared?.options.pythonCuration,
    loading: Boolean(viewerId && enabled && !current),
    unavailable: Boolean(current?.prepared && current.prepared.environments.length === 0),
    error: current?.error,
    retry: useCallback(() => setAttempt((value) => value + 1), []),
  }
}
