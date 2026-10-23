import { awaitWithSignal } from '@sistemazero/core/http'
import { isStudioProArtifact } from '@sistemazero/core/studio/pro-artifact'
import { STUDIO_PRO_BUILD_LIMITS } from '@sistemazero/core/studio/pro-limits'
import type {
  PrepareProDependencies,
  StudioProRuntimeAdapter,
  StudioProRuntimeBuildInput,
} from '@sistemazero/studio'
import { sessionFetch } from '../session-fetch'
import { assertLiveStudioAuthority, type LiveStudioAuthority } from './studio-runtime'
import { sameLiveProject } from './workspace-compare'

/** Admission uses the journal; the long build deliberately runs outside its queue. */
export function createLiveProRuntime(
  input: LiveStudioAuthority & {
    queue: { current: Promise<void> }
    save(): Promise<void>
  },
): StudioProRuntimeAdapter {
  const context = structuredClone(input.context)
  const request = async (
    { project, signal: caller }: StudioProRuntimeBuildInput,
    prepare: boolean,
  ) => {
    const snapshot = structuredClone(project)
    const signal = AbortSignal.any([
      input.signal,
      ...(caller ? [caller] : []),
      AbortSignal.timeout(60_000),
    ])
    const scope = { ...input, context, signal }
    assertLiveStudioAuthority(scope, false)
    if (snapshot.kind !== 'pro' || snapshot.id !== context.workspaceId)
      throw new Error('Abra o projeto Pro desta oficina para executar.')
    await awaitWithSignal(() => input.save(), signal)
    const pending = input.queue.current.then(() => {
      const current = assertLiveStudioAuthority(scope, false)
      if (!sameLiveProject(current.project, snapshot))
        throw new Error('O projeto mudou. Execute novamente a revisão atual.')
      return current.revision
    })
    input.queue.current = pending.then(
      () => undefined,
      () => undefined,
    )
    const revision = await awaitWithSignal(() => pending, signal)
    const response = await sessionFetch(`/api/live/workspaces/${context.workspaceId}/pro-build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(prepare ? { 'X-Studio-Pro-Operation': 'prepare-dependencies' } : {}),
      },
      cache: 'no-store',
      signal,
      body: JSON.stringify({ context, expectedWorkspaceRevision: revision }),
    })
    const value: unknown = await response.json()
    const current = assertLiveStudioAuthority(scope, false)
    if (current.revision !== revision || !sameLiveProject(current.project, snapshot))
      throw new Error('O projeto mudou durante a compilação. Execute a revisão atual.')
    if (!response.ok || !value || typeof value !== 'object')
      throw new Error(
        'Não foi possível compilar esta revisão. Confira a autoria e tente novamente.',
      )
    if (!('workspaceRevision' in value) || value.workspaceRevision !== revision)
      throw new Error('A resposta não corresponde à revisão confirmada.')
    return value
  }
  const prepareDependencies: PrepareProDependencies = async (input) => {
    const value = await request(input, true)
    if (
      !('packageLock' in value) ||
      typeof value.packageLock !== 'string' ||
      value.packageLock.length > STUDIO_PRO_BUILD_LIMITS.maxFileChars
    )
      throw new Error('Não foi possível preparar o lock desta revisão.')
    return value.packageLock
  }
  return {
    limits: STUDIO_PRO_BUILD_LIMITS,
    signal: input.signal,
    prepareDependencies,
    async build(input) {
      const value = await request(input, false)
      if (
        !('artifact' in value) ||
        !isStudioProArtifact(value.artifact) ||
        value.artifact.expiresAt <= Date.now()
      )
        throw new Error('A compilação não corresponde à revisão confirmada.')
      return {
        artifact: value.artifact,
        ...('output' in value && typeof value.output === 'string' ? { output: value.output } : {}),
        ...('durationMs' in value && typeof value.durationMs === 'number'
          ? { durationMs: value.durationMs }
          : {}),
      }
    },
  }
}
