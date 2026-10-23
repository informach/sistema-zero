import { COPY } from '../core/copy'
import { structuredBytes } from '../core/structuredBytes'
import type { MoldaSceneDocument } from '../scene/document'
import { type CreateDocumentEditorStoreOptions, createDocumentEditorStore } from './editorStore'
import type { createScenePersistence } from './scenePersistence'
import { createSceneRecoveryController } from './sceneRecoveryController'
import type { SceneRecoveryPersistence } from './sceneRecoveryPersistence'
import { createSceneStorageObserver } from './sceneStorageObserver'

export class SceneSaveConflictError extends Error {
  constructor() {
    super(COPY.scene.conflict)
    this.name = 'SceneSaveConflictError'
  }
}

/** One open document owns one CAS token. A failed save never adopts a newer token. */
export function createSceneEditorStore(
  asset: MoldaSceneDocument,
  revision: number,
  persistence: Pick<
    ReturnType<typeof createScenePersistence>,
    'save' | 'readIndexRevision' | 'subscribe'
  > & { recovery?: SceneRecoveryPersistence },
  options: Pick<
    CreateDocumentEditorStoreOptions<MoldaSceneDocument>,
    'autosaveMs' | 'byteBudget' | 'now' | 'onSaved'
  > = {},
) {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new TypeError('Invalid scene revision')
  const id = asset.id
  let expectedRevision = revision
  let saving = false
  const storage = createSceneStorageObserver(
    id,
    persistence,
    () => expectedRevision,
    () => saving,
  )
  const editor = createDocumentEditorStore({
    ...options,
    asset,
    sizeOf: structuredBytes,
    saveErrorMessage: (error) =>
      error instanceof SceneSaveConflictError ? error.message : undefined,
    persistence: {
      async save(document) {
        if (document.id !== id) throw new TypeError('Scene editor cannot change document identity')
        saving = true
        try {
          const result = await persistence.save(document, expectedRevision)
          if (result.status !== 'saved') throw new SceneSaveConflictError()
          expectedRevision = result.revision
        } finally {
          saving = false
          void storage.refresh()
        }
      },
    },
  })
  const recovery = persistence.recovery
    ? createSceneRecoveryController(
        editor,
        persistence.recovery,
        () => expectedRevision,
        () => persistence.readIndexRevision(id),
      )
    : undefined
  if (recovery) {
    const flush = editor.getState().flush
    editor.setState({
      async flush() {
        await recovery.flush()
        await flush()
        await recovery.flush()
      },
    })
  }
  return Object.assign(editor, { storage, recovery })
}

export type SceneEditorStore = ReturnType<typeof createSceneEditorStore>
