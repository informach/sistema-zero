import { type RefObject, useMemo } from 'react'
import { createGameStorageSession } from '../../state/gameStorage'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import { useProStorageBridge } from './useProStorageBridge'

export function useProGameStorage(input: {
  frame: RefObject<HTMLIFrameElement | null>
  projectId: string | null
  revision: number
  identity: string
  origin: string | null
}): string {
  const scope = captureProjectStorageScope()
  // biome-ignore lint/correctness/useExhaustiveDependencies: a profile change must replace the captured storage backend
  const backend = useMemo(
    () => (input.projectId ? createGameStorageSession(input.projectId) : null),
    [input.projectId, scope],
  )
  return useProStorageBridge({
    ...input,
    identity: `${input.projectId}:${input.identity}`,
    backend,
  })
}
