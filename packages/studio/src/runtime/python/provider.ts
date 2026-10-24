import type { StudioRuntimeSelection } from '@sistemazero/core/studio/project-environment'
import {
  assertStudioPythonActivityScope,
  StudioPythonActivitySchema,
} from '@sistemazero/core/studio/python-activity'
import {
  type StudioExecutionIdentity,
  type StudioRuntimeProvider,
  StudioRuntimeUnavailableError,
} from '../types'
import { readPythonExecutionIdentity } from './frameProtocol'
import { preparePythonFrameSession } from './session'
import { preparePythonExecutionSnapshot } from './snapshot'

export interface ApprovedPythonFrame {
  /** Host/catalog-owned URL on the separate execution origin. Never project content. */
  url: string
  runtimeManifestSha256: string
}

/** Inject the host's approved artifact resolver; this module never resolves arbitrary packages. */
export function createPythonRuntimeProvider(options: {
  id: string
  allowedOrigins: readonly string[]
  resolveFrame(
    selection: StudioRuntimeSelection,
    signal: AbortSignal,
    identity: StudioExecutionIdentity,
  ): Promise<ApprovedPythonFrame>
}): StudioRuntimeProvider {
  const allowedOrigins = new Set(options.allowedOrigins.map((value) => new URL(value).origin))
  return {
    id: options.id,
    async prepare(input) {
      const { frame, signal } = input
      const activity =
        input.pythonActivity === undefined
          ? undefined
          : StudioPythonActivitySchema.parse(input.pythonActivity)
      const identity = readPythonExecutionIdentity(input.identity)
      if (!identity)
        throw new StudioRuntimeUnavailableError(
          'invalid-identity',
          'A identidade de execução é inválida.',
        )
      if (signal.aborted)
        throw signal.reason ?? new DOMException('Execução cancelada.', 'AbortError')
      // Snapshot reader captures all project data before its first await.
      const snapshot = await preparePythonExecutionSnapshot(input.project)
      if (activity) assertStudioPythonActivityScope(activity, snapshot.configuration)
      if (
        snapshot.projectId !== identity.projectId ||
        snapshot.revision !== identity.revision ||
        snapshot.configuration.runtime.manifestSha256 !== identity.runtimeManifestSha256
      )
        throw new StudioRuntimeUnavailableError(
          'snapshot-mismatch',
          'O projeto mudou desde a preparação da execução.',
        )
      if (signal.aborted)
        throw signal.reason ?? new DOMException('Execução cancelada.', 'AbortError')
      const approved = await new Promise<ApprovedPythonFrame>((resolve, reject) => {
        const abort = () =>
          reject(signal.reason ?? new DOMException('Execução cancelada.', 'AbortError'))
        signal.addEventListener('abort', abort, { once: true })
        Promise.resolve()
          .then(() => {
            if (signal.aborted)
              throw signal.reason ?? new DOMException('Execução cancelada.', 'AbortError')
            return options.resolveFrame(snapshot.configuration.runtime, signal, identity)
          })
          .then(resolve, reject)
          .finally(() => signal.removeEventListener('abort', abort))
      })
      const url = new URL(approved.url)
      if (
        approved.runtimeManifestSha256 !== identity.runtimeManifestSha256 ||
        !allowedOrigins.has(url.origin) ||
        url.origin === window.location.origin ||
        !['https:', 'http:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        !url.pathname.endsWith('/frame.html') ||
        (url.protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
      )
        throw new StudioRuntimeUnavailableError(
          'unapproved-frame',
          'A distribuição Python não corresponde ao ambiente aprovado.',
        )
      return preparePythonFrameSession({
        frame,
        frameURL: url,
        identity,
        snapshot,
        signal,
        hostAudio: input.hostAudio,
        ...(activity ? { activity } : {}),
        ...(input.pythonMission ? { mission: true } : {}),
      })
    },
  }
}
