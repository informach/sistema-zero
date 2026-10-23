import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import type { PintaImageDerivation } from '@sistemazero/core/studio/pinta-image'
import { IDBFactory } from 'fake-indexeddb'
import { documentFixture } from './fixtures/projectDocuments'
import { persistProject } from './persistence'
import { captureProjectStorageScope, setProjectStorageNamespace } from './projectStorageRuntime'
import { createProjectStore, loadSanitizedProjectById } from './projectStore'
import { refinePythonProjectDocument } from './pythonProjectValidation'

const dataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII='
const bytes = Buffer.from(dataUrl.split(',')[1]!, 'base64')
function metadata(frameIndex: number): PintaImageDerivation {
  return {
    recipe: {
      version: 1,
      algorithm: 'pinta-image-1',
      drawingId: 'original',
      selection: { kind: 'frame', animationId: 'andar', frameIndex },
      scale: 1,
    },
    provenance: { sourceSha256: 'a'.repeat(64), dependencies: [] },
    output: {
      mime: 'image/png',
      width: 1,
      height: 1,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    },
  }
}

describe('captured Pinta images in the real Python project store', () => {
  for (const kind of ['classic', 'pro'] as const) {
    test(`${kind}: frame identity/path/PNG survive updates, local reopen, duplicate and portable import`, async () => {
      const previous = captureProjectStorageScope()
      const originalIndexedDB = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
      Object.defineProperty(globalThis, 'indexedDB', {
        value: new IDBFactory(),
        configurable: true,
      })
      setProjectStorageNamespace(`pinta-c1-${crypto.randomUUID()}`)
      try {
        const raw = documentFixture('python', kind)
        raw.assets = []
        const store = createProjectStore()
        store.getState().hydrateProject(await refinePythonProjectDocument(raw))
        const input = {
          name: 'heroi',
          kind: 'image' as const,
          source: 'library' as const,
          libId: 'personal:original',
          libOrigin: 'pinta' as const,
          libRevision: 3,
          dataUrl,
          width: 1,
          height: 1,
          pintaImage: metadata(0),
        }
        const before = store.getState().project
        expect(store.getState().addAsset({ ...input, pintaImage: null })).toBeTruthy()
        expect(store.getState().project).toBe(before)
        expect(store.getState().addAsset(input)).toBeNull()
        expect(
          store.getState().addAsset({ ...input, name: 'heroi-2', pintaImage: metadata(1) }),
        ).toBeNull()
        const [first, second] = store.getState().project!.assets!
        expect(first!.id).not.toBe(second!.id)
        expect(first!.proPath).toBe('assets/heroi.png')
        expect(second!.proPath).toBe('assets/heroi-2.png')
        expect(first!.libId).toBe(second!.libId)

        const beforeRefusal = store.getState().project
        expect(store.getState().updateAssetImage(first!.id, { dataUrl })).toContain('receita')
        expect(
          store.getState().updateAssetMeta(first!.id, { tileset: { tileSize: 1, solid: [] } }),
        ).toBeTruthy()
        expect(
          store.getState().updateAssetImage(first!.id, {
            dataUrl,
            pintaImage: { ...metadata(0), recipe: { ...metadata(0).recipe, drawingId: 'other' } },
          }),
        ).toBeTruthy()
        expect(store.getState().project).toBe(beforeRefusal)

        const nextMetadata = metadata(0)
        nextMetadata.provenance.sourceSha256 = 'b'.repeat(64)
        expect(
          store
            .getState()
            .updateAssetImage(first!.id, { dataUrl, pintaImage: nextMetadata, libRevision: 4 }),
        ).toBeNull()
        const project = store.getState().project!
        expect(project.assets![0]).toEqual({ ...first!, pintaImage: nextMetadata, libRevision: 4 })
        expect(project.assets![1]).toEqual(second!)
        await persistProject(project)
        expect((await loadSanitizedProjectById(project.id))!.assets).toEqual(project.assets)
        const duplicate = (await store.getState().duplicateProject(project.id))!
        expect(duplicate.id).not.toBe(project.id)
        expect(duplicate.assets).toEqual(project.assets)
        expect((await loadSanitizedProjectById(duplicate.id))!.assets).toEqual(project.assets)
        const imported = await store
          .getState()
          .importProjectFromJSON(JSON.parse(JSON.stringify(project)))
        expect(imported.project.id).not.toBe(project.id)
        expect(imported.project.assets).toEqual(project.assets)
        expect((await loadSanitizedProjectById(imported.project.id))!.assets).toEqual(
          project.assets,
        )

        const forged = JSON.parse(JSON.stringify(project))
        forged.assets[0].pintaImage.output.sha256 = '0'.repeat(64)
        const beforeImport = store.getState().project
        const failure = await store
          .getState()
          .importProjectFromJSON(forged)
          .then(
            () => null,
            (error: unknown) => error,
          )
        expect(failure).toBeInstanceOf(Error)
        expect(store.getState().project).toBe(beforeImport)
        expect((await loadSanitizedProjectById(project.id))!.assets).toEqual(project.assets)
        if (kind === 'classic') {
          const preservedCopies: unknown[] = []
          await store.getState().convertToPro(async (copy) => {
            preservedCopies.push(copy.assets)
          })
          expect(store.getState().project?.kind).toBe('pro')
          expect(store.getState().project?.assets).toEqual(project.assets)
          expect(preservedCopies).toEqual([project.assets])
        }
      } finally {
        setProjectStorageNamespace(previous.namespace)
        if (originalIndexedDB) Object.defineProperty(globalThis, 'indexedDB', originalIndexedDB)
        else Reflect.deleteProperty(globalThis, 'indexedDB')
      }
    })
  }
})
