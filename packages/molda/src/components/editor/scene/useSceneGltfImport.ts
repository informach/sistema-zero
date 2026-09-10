import { GLTF_IMPORT_COPY as copy } from '../../../core/gltfImportCopy'
import { GltfInputError } from '../../../import/gltfInput'
import {
  type GltfChosenFile,
  type GltfLocalBundle,
  readGltfLocalBundle,
} from '../../../import/gltfLocalBundle'
import type { GltfNativeOptions } from '../../../import/gltfNativeDocument'
import type { MoldaSceneDocument } from '../../../scene/document'
import { SceneValidationError } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import { prepareGltfImportInWorker } from '../../../workers/gltfImport'
import type { GltfImportInspection, GltfImportResult } from '../../../workers/gltfImportProtocol'
import type { GltfImportRequest } from '../../../workers/gltfImportRequest'
import type { TaskWorker } from '../../../workers/workerTask'
import { type SceneImportStage, useSceneImportConfirmation } from './useSceneImportConfirmation'
import { type SceneImportOwner as Owner, useSceneImportSession } from './useSceneImportSession'

type Ready = Extract<GltfImportResult, { status: 'ready' }>
interface ImportView {
  bundle: GltfLocalBundle | null
  entryPath: string | null
  inspection: GltfImportInspection | null
  sceneIndex: number | null | 'unselected'
  options: GltfNativeOptions
  stage: SceneImportStage<Ready>
}
const initial = (): ImportView => ({
  bundle: null,
  entryPath: null,
  inspection: null,
  sceneIndex: 'unselected',
  options: {},
  stage: { kind: 'choose' },
})
const cancelled = (view: ImportView, message: string): ImportView => ({
  ...view,
  stage: { kind: 'choose', message },
})

/** Session-only staging. A completed review remains revision-owned until one explicit commit. */
export function useSceneGltfImport(
  editor: EditorStore<MoldaSceneDocument>,
  options: {
    createWorker?: () => TaskWorker
    canAdopt?: () => boolean
  } = {},
) {
  const session = useSceneImportSession(editor, initial, cancelled, copy),
    { view, current, owner, publish, revoke, cancel, owns, begin, isActive } = session,
    { accept, confirm } = useSceneImportConfirmation(session, options.canAdopt, copy)
  function failed(entry: Owner, error: unknown) {
    if (!owns(entry)) return
    owner.current = null
    const known = error instanceof GltfInputError || error instanceof SceneValidationError
    publish({
      ...current.current,
      stage: {
        kind: 'error',
        message: known ? error.message : copy.failed,
        ...(known ? { path: error.path } : {}),
      },
    })
  }
  async function run(entry: Owner, sceneIndex: GltfImportRequest['sceneIndex']) {
    const state = current.current,
      file = state.bundle?.files.find((file) => file.path === state.entryPath)
    if (!file || !state.bundle || !owns(entry)) return
    publish({ ...state, stage: { kind: 'busy', progress: 'validating' } })
    const asset = entry.editor.getState().asset
    try {
      const result = await prepareGltfImportInWorker(
        {
          documentId: entry.documentId,
          revision: entry.revision,
          requestId: entry.requestId,
          bytes: file.bytes,
          files: state.bundle.files.filter((item) => item.path !== file.path),
          entryPath: file.path,
          sceneIndex,
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
          createWorker: options.createWorker,
          onProgress: (progress) => {
            if (owns(entry)) publish({ ...current.current, stage: { kind: 'busy', progress } })
          },
        },
      )
      if (!owns(entry)) return
      if (result.status === 'inspect')
        publish({
          ...current.current,
          inspection: result.source,
          sceneIndex: result.source.scenes.length ? 'unselected' : null,
          stage: { kind: 'choose' },
        })
      else if (result.status === 'missing')
        publish({ ...current.current, stage: { kind: 'missing', paths: result.paths } })
      else publish({ ...current.current, stage: { kind: 'ready', result, accepted: false } })
    } catch (error) {
      failed(entry, error)
    }
  }
  async function choose(files: readonly GltfChosenFile[], append = false) {
    if (!files.length) return
    const previous = current.current,
      entry = begin()
    if (!entry) return
    publish({
      ...(append ? previous : initial()),
      inspection: null,
      sceneIndex: 'unselected',
      stage: { kind: 'reading-files' },
    })
    try {
      const bundle = await readGltfLocalBundle(
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
      if (entryPath) await run(entry, 'inspect')
    } catch (error) {
      failed(entry, error)
    }
  }
  async function inspect(entryPath = current.current.entryPath) {
    if (!entryPath || !current.current.bundle?.entries.includes(entryPath)) return
    const entry = begin()
    if (!entry) return
    publish({
      ...current.current,
      entryPath,
      inspection: null,
      sceneIndex: 'unselected',
      stage: { kind: 'choose' },
    })
    await run(entry, 'inspect')
  }
  function setScene(sceneIndex: number | null) {
    if (!isActive()) return
    const source = current.current.inspection
    if (
      !source ||
      (sceneIndex === null
        ? source.scenes.length !== 0
        : !source.scenes.some((scene) => scene.index === sceneIndex))
    )
      return
    if (!revoke()) return
    publish({ ...current.current, sceneIndex, stage: { kind: 'choose' } })
  }
  function setOptions(next: GltfNativeOptions) {
    if (!isActive()) return
    if (!revoke()) return
    publish({ ...current.current, options: next, stage: { kind: 'choose' } })
  }
  async function prepare() {
    const scene = current.current.sceneIndex
    if (!current.current.inspection || scene === 'unselected') return
    const entry = begin()
    if (entry) await run(entry, scene)
  }
  return {
    view,
    choose,
    inspect,
    setScene,
    setOptions,
    prepare,
    accept,
    confirm,
    cancel: () => {
      cancel()
    },
  }
}
