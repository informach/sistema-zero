import type { LiveWorkspaceView } from '@sistemazero/core/live'
import type {
  StudioLiveRuntimeContext,
  StudioRuntimeCandidate,
} from '@sistemazero/core/studio/runtime-authorization'
import { LiveRequestError, liveRequest } from './client'

interface LiveStudioAuthority {
  context: StudioLiveRuntimeContext
  userId: string
  signal: AbortSignal
  access?: 'author' | 'observer'
  current(): LiveWorkspaceView
}
function assertLiveStudioAuthority(input: LiveStudioAuthority, analyze: boolean) {
  input.signal.throwIfAborted()
  const current = input.current()
  if (
    current.id !== input.context.workspaceId ||
    current.writerEpoch !== input.context.writerEpoch ||
    (input.access === 'observer'
      ? !analyze
      : current.readOnly ||
        current.writerId !== input.userId ||
        current.writerDeviceId !== input.context.deviceId ||
        !current.leaseExpiresAt ||
        !(Date.parse(current.leaseExpiresAt) > Date.now()))
  )
    throw new LiveRequestError(
      'A autoria mudou. Seu projeto continua preservado.',
      'LIVE_AUTHORITY_CHANGED',
      409,
    )
  return current
}

/** Only the BFF's fresh-policy acknowledgement occupies the journal queue.
 * Native startup and result bodies are read by the provider after it releases the queue. */
export function liveStudioAnalysisContext(
  input: LiveStudioAuthority & { queue: { current: Promise<void> } },
) {
  return {
    context() {
      const current = assertLiveStudioAuthority(input, true)
      return { ...input.context, expectedWorkspaceRevision: current.revision }
    },
    schedule(operation: () => Promise<Response>) {
      const pending = input.queue.current.then(async () => {
        assertLiveStudioAuthority(input, true)
        const response = await operation()
        // The provider reads a reserved ID even after cancellation so it can
        // close it. Its context signal rejects all later results and commands.
        return response
      })
      input.queue.current = pending.then(
        () => undefined,
        () => undefined,
      )
      return pending
    },
  }
}

/** Shares the commit queue so this device's own autosave cannot race its permission read. */
export function requestLiveStudioRuntime(input: {
  candidate: StudioRuntimeCandidate
  context: StudioLiveRuntimeContext
  userId: string
  signal: AbortSignal
  access?: 'author' | 'observer'
  queue: { current: Promise<void> }
  current(): LiveWorkspaceView
}) {
  function assertWriter() {
    return assertLiveStudioAuthority(input, input.candidate.operation === 'analyze')
  }
  const operation = input.queue.current.then(async () => {
    const current = assertWriter()
    const revision = current.revision
    const response = await liveRequest<unknown>(
      `/api/live/workspaces/${current.id}/runtime`,
      {
        ...input.candidate,
        context: input.context,
        expectedWorkspaceRevision: revision,
      },
      'POST',
      input.signal,
    )
    assertWriter()
    if (
      !response ||
      typeof response !== 'object' ||
      !('workspaceRevision' in response) ||
      response.workspaceRevision !== revision
    )
      throw new Error('A execução não corresponde à revisão confirmada do projeto.')
    // The contextual factory validates the remaining response against actor, environment,
    // snapshot digest and scope. Compare revision to this request, never to a newer ref.
    return response
  })
  // The caller owns this failure. Settling the queue lets the journal save subsequent work;
  // a denied execution must never discard or permanently block a local save.
  input.queue.current = operation.then(
    () => undefined,
    () => undefined,
  )
  return operation
}
