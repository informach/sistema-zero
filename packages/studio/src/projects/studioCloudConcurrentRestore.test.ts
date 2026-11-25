import 'blockly/blocks'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { createStudioCloudSync } from '../../../member-shell/src/lib/studio-cloud'
import { createStudioCloudTransport } from '../../../member-shell/src/lib/studio-cloud-transport'
import { registerExtensionBlocks } from '../blockly/blocks'
import { ensureBlocklyInitialized } from '../blockly/setup'
import { gameTwoDBlocks } from '../official-extensions/game-2d/blocks'
import { isProjectOpenAnywhere } from '../state/persistence'
import { setStudioCloudMirror } from '../state/projectPersistenceEvents'
import { getProjectStorageScope, setProjectStorageNamespace } from '../state/projectStorageRuntime'
import { createLocalPersistenceAdapter, loadSanitizedProjectById } from '../state/projectStore'
import {
  installPngImageBitmap,
  regionalSceneMaterial,
} from '../testing/pintaRegionalMaterialFixture'
import * as snapshots from './importSnapshot'
import { buildTilemapGameProject } from './tilemapGame'

const originals = ['indexedDB', 'IDBKeyRange'].map(
  (name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
)
let restoreBitmap: () => void
beforeAll(() => {
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
  Object.defineProperty(globalThis, 'IDBKeyRange', { value: IDBKeyRange, configurable: true })
  restoreBitmap = installPngImageBitmap()
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})
afterAll(() => {
  restoreBitmap()
  setProjectStorageNamespace('')
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else Reflect.deleteProperty(globalThis, name)
  }
})

for (const identical of [true, false])
  test(
    identical
      ? 'a cold deep link and gallery pull share the same native restore, retaining blocks and PNG'
      : 'different snapshots with the same remote revision still face native write conflict protection',
    async () => {
      const material = await regionalSceneMaterial()
      const project = await buildTilemapGameProject(
        { ...material, id: material.regional.sourceId },
        { namespace: `source-${crypto.randomUUID()}` },
      )
      if (!project) throw new Error('Missing fixture')
      const namespace = `cold-${crypto.randomUUID()}`
      const summary = {
        itemId: project.id,
        name: project.name,
        kind: 'classic',
        formatVersion: 2,
        itemUpdatedAt: project.updatedAt,
        revision: 4,
        bytes: 100,
        thumb: null,
        syncedAt: 30,
      }
      const cloud = createStudioCloudTransport({
        fetch: async () => {
          throw new Error('Unexpected network')
        },
      })
      cloud.list = async () => [summary]
      cloud.download = async () => ({
        json: JSON.stringify(project),
        summary,
        parts: [],
        fetchPart: async () => {
          throw new Error('No parts')
        },
      })
      let enter!: () => void
      let release!: () => void
      const entered = new Promise<void>((done) => {
        enter = done
      })
      const gate = new Promise<void>((done) => {
        release = done
      })
      let admitted!: () => void
      const secondAdmitted = new Promise<void>((done) => {
        admitted = done
      })
      let validations = 0
      let writes = 0
      const sync = createStudioCloudSync({
        viewerId: namespace,
        localNamespace: namespace,
        cloud,
        studio: {
          ...snapshots,
          setStudioCloudMirror,
          createLocalPersistenceAdapter,
          isProjectOpenAnywhere,
          validateCloudProjectSnapshot: async (raw, options) => {
            const result = await snapshots.validateCloudProjectSnapshot(raw, options)
            validations += 1
            if (validations === 2) admitted()
            return result
          },
          restoreProjectFromCloud: async (raw, options) => {
            writes += 1
            enter()
            await gate
            return snapshots.restoreProjectFromCloud(raw, options)
          },
        },
      })
      try {
        const pulling = sync.pullMissing()
        await entered
        if (!identical)
          cloud.download = async () => ({
            json: JSON.stringify({ ...project, name: 'Outra cópia' }),
            summary,
            parts: [],
            fetchPart: async () => {
              throw new Error('No parts')
            },
          })
        const opening = sync.restoreProject(project.id).then(
          (value) => value,
          (error: Error) => error.name,
        )
        // The second real admission has finished; release both writes in the next turn.
        await secondAdmitted
        await new Promise((done) => setTimeout(done, 0))
        release()
        await pulling
        expect(await opening).toBe(identical ? true : 'ProjectWriteConflict')
        expect(writes).toBe(identical ? 1 : 2)
        const restored = await loadSanitizedProjectById(
          project.id,
          getProjectStorageScope(namespace),
        )
        expect(restored?.files).toEqual(project.files)
        expect(restored?.blocksState).toEqual(project.blocksState)
        expect(restored?.assets?.[0]?.regional?.sha256).toBe(material.regional.sha256)
        expect(restored?.name).toBe(project.name)
      } finally {
        release()
        sync.cancelPull()
        cloud.dispose()
      }
    },
  )
