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
import {
  type PythonSavedFileChange,
  prunePythonSavedFiles,
  withoutPythonSavedFile,
  withPythonSavedFile,
} from './savedFiles'
import { preparePythonFrameSession } from './session'
import { preparePythonExecutionSnapshot } from './snapshot'

export interface ApprovedPythonFrame {
  /** Host/catalog-owned URL on the separate execution origin. Never project content. */
  url: string
  runtimeManifestSha256: string
}

/** The project's game storage record (state/gameStorage.ts), where saved files are kept. */
export interface PythonSavedFileStore {
  load(): Promise<Record<string, string>>
  write(data: Record<string, string>): Promise<void>
}

/** Inject the host's approved artifact resolver; this module never resolves arbitrary packages. */
export function createPythonRuntimeProvider(options: {
  id: string
  allowedOrigins: readonly string[]
  /** Without it, the files a program saves only live during its run. */
  savedFiles?(projectId: string): PythonSavedFileStore
  resolveFrame(
    selection: StudioRuntimeSelection,
    signal: AbortSignal,
    identity: StudioExecutionIdentity,
  ): Promise<ApprovedPythonFrame>
}): StudioRuntimeProvider {
  const allowedOrigins = new Set(options.allowedOrigins.map((value) => new URL(value).origin))
  /** Per project, the writes of a run still going to storage: the next run reads after them. */
  const savingByProject = new Map<string, Promise<void>>()
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
      // Files the program saved in earlier runs (savedFiles.ts). A storage that does not
      // answer only means nothing was kept: the run goes on.
      const projectId = snapshot.projectId
      const store = options.savedFiles?.(projectId)
      let record: Record<string, string> = {}
      if (store)
        try {
          // A finished write may start the next one; wait for the whole chain (bounded).
          for (let turn = 0; turn < 32 && savingByProject.has(projectId); turn++)
            await savingByProject.get(projectId)
          record = await store.load()
        } catch {
          record = {}
        }
      // A project file with the same path (even only by letter case) wins and the old saved
      // copy leaves the record: it would only take room in the limits.
      const saved = prunePythonSavedFiles(
        record,
        snapshot.files.map((file) => file.path),
        snapshot.directories,
      )
      // One write at a time, always of the newest record: a game that saves every frame does
      // not pile up copies of it.
      let latest: Record<string, string> | undefined
      let writing = false
      const persist = () => {
        if (!store || writing || !latest) return
        const data = latest
        latest = undefined
        writing = true
        const done = store
          .write(data)
          .catch(() => undefined)
          .finally(() => {
            writing = false
            if (latest) persist()
            else if (savingByProject.get(projectId) === done) savingByProject.delete(projectId)
          })
        savingByProject.set(projectId, done)
      }
      const keepSavedFile = store
        ? (file: PythonSavedFileChange) => {
            // A deleted file leaves the record; a written one goes in, within the limits.
            const next = file.bytes
              ? withPythonSavedFile(record, { path: file.path, bytes: file.bytes })
              : withoutPythonSavedFile(record, file.path)
            if (!next || next === record) return
            record = next
            latest = next
            persist()
          }
        : undefined
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
        snapshot: saved.length ? { ...snapshot, saved } : snapshot,
        ...(keepSavedFile ? { onSavedFile: keepSavedFile } : {}),
        signal,
        hostAudio: input.hostAudio,
        ...(activity ? { activity } : {}),
        ...(input.pythonMission ? { mission: true } : {}),
      })
    },
  }
}
