import type { NativeImportIdentity } from '../../../import/importDocumentBase'
import type { LocalImportBundle, LocalImportChosenFile } from '../../../import/localImportBundle'
import type { MoldaSceneDocument } from '../../../scene/document'
import { SceneValidationError } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import type { NativeImportToken } from '../../../workers/nativeImportRequest'
import type { TaskWorker } from '../../../workers/workerTask'
import { type SceneImportStage, useSceneImportConfirmation } from './useSceneImportConfirmation'
import {
  type SceneImportMessages,
  type SceneImportOwner,
  useSceneImportSession,
} from './useSceneImportSession'

interface ReadyDocument {
  status: 'ready'
  document: MoldaSceneDocument
}
interface ImportView<Options, Ready> {
  bundle: LocalImportBundle | null
  entryPath: string | null
  options: Options
  stage: SceneImportStage<Ready>
}
export interface SceneFileImportControls {
  signal?: AbortSignal
  createWorker?: () => TaskWorker
  onProgress?: (progress: 'validating' | 'reading' | 'converting') => void
}
export interface SceneFileImportHost {
  createWorker?: () => TaskWorker
  canAdopt?: () => boolean
}
interface FileRequest<Options> extends NativeImportToken {
  bytes: Uint8Array
  files: LocalImportBundle['files']
  entryPath: string
  identity: NativeImportIdentity
  options: Options
}
export interface SceneFileImportAdapter<
  InputOptions,
  Options extends InputOptions,
  Ready extends ReadyDocument,
> {
  initial(): ImportView<Options, Ready>
  cancelled(view: ImportView<Options, Ready>, message: string): ImportView<Options, Ready>
  readOptions(value: InputOptions): Options
  readBundle(
    files: readonly LocalImportChosenFile[],
    signal: AbortSignal,
    previous?: LocalImportBundle['files'],
  ): Promise<LocalImportBundle>
  prepare(
    request: FileRequest<Options>,
    controls: SceneFileImportControls,
  ): Promise<Ready | { status: 'missing'; paths: string[] }>
  describeError(error: unknown): { path: string; message: string } | null
  messages: SceneImportMessages & { pendingPose: string; failed: string; noEntry: string }
}

/** Stable format adapters share the same selection/review lifecycle; no conversion before Prepare. */
export function useSceneFileImport<
  InputOptions,
  Options extends InputOptions,
  Ready extends ReadyDocument,
>(
  editor: EditorStore<MoldaSceneDocument>,
  adapter: SceneFileImportAdapter<InputOptions, Options, Ready>,
  host: SceneFileImportHost = {},
) {
  const copy = adapter.messages,
    session = useSceneImportSession(editor, adapter.initial, adapter.cancelled, copy),
    { view, current, owner, publish, revoke, cancel, owns, begin } = session,
    { accept, confirm } = useSceneImportConfirmation(session, host.canAdopt, copy)
  function failed(entry: SceneImportOwner, error: unknown) {
    if (!owns(entry)) return
    owner.current = null
    const known = error instanceof SceneValidationError ? error : adapter.describeError(error)
    publish({
      ...current.current,
      stage: {
        kind: 'error',
        message: known ? known.message : copy.failed,
        ...(known ? { path: known.path } : {}),
      },
    })
  }
  async function choose(files: readonly LocalImportChosenFile[], append = false) {
    if (!files.length) return
    const previous = current.current,
      entry = begin()
    if (!entry) return
    publish({ ...(append ? previous : adapter.initial()), stage: { kind: 'reading-files' } })
    try {
      const bundle = await adapter.readBundle(
        files,
        entry.controller.signal,
        append ? previous.bundle?.files : undefined,
      )
      if (!owns(entry)) return
      const entryPath =
        append && previous.entryPath && bundle.entries.includes(previous.entryPath)
          ? previous.entryPath
          : bundle.entries.length === 1
            ? bundle.entries[0]!
            : null
      publish({
        ...current.current,
        bundle,
        entryPath,
        stage: { kind: 'choose', ...(!bundle.entries.length ? { message: copy.noEntry } : {}) },
      })
    } catch (error) {
      failed(entry, error)
    }
  }
  function setEntry(entryPath: string) {
    if (!current.current.bundle?.entries.includes(entryPath) || !revoke()) return
    publish({ ...current.current, entryPath, stage: { kind: 'choose' } })
  }
  function setOptions(next: InputOptions) {
    if (!session.isActive()) return
    const normalized = adapter.readOptions(next)
    if (!revoke()) return
    publish({ ...current.current, options: normalized, stage: { kind: 'choose' } })
  }
  async function prepare() {
    const state = current.current,
      file = state.bundle?.files.find((file) => file.path === state.entryPath)
    if (!file || !state.bundle) return
    const entry = begin()
    if (!entry) return
    publish({ ...state, stage: { kind: 'busy', progress: 'validating' } })
    const asset = entry.editor.getState().asset
    try {
      const result = await adapter.prepare(
        {
          documentId: entry.documentId,
          revision: entry.revision,
          requestId: entry.requestId,
          bytes: file.bytes,
          files: state.bundle.files.filter((item) => item.path !== file.path),
          entryPath: file.path,
          options: state.options,
          identity: {
            id: asset.id,
            name: asset.name,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
          },
        },
        {
          signal: entry.controller.signal,
          createWorker: host.createWorker,
          onProgress: (progress) => {
            if (owns(entry)) publish({ ...current.current, stage: { kind: 'busy', progress } })
          },
        },
      )
      if (!owns(entry)) return
      publish({
        ...current.current,
        stage:
          result.status === 'missing'
            ? { kind: 'missing', paths: result.paths }
            : { kind: 'ready', result, accepted: false },
      })
    } catch (error) {
      failed(entry, error)
    }
  }
  return { view, choose, setEntry, setOptions, prepare, accept, confirm, cancel: () => cancel() }
}
