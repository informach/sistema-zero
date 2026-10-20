import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import type { PintaImageDerivation } from '@sistemazero/core/studio/pinta-image'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { createProjectStore } from '../../state/projectStore'
import { refinePythonProjectDocument } from '../../state/pythonProjectValidation'
import { addPintaCreationToProject } from './addCreationToProject'

const dataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII='
const bytes = Buffer.from(dataUrl.split(',')[1]!, 'base64')
function imported(frameIndex: number) {
  const pintaImage: PintaImageDerivation = {
    recipe: {
      version: 1,
      algorithm: 'pinta-image-1',
      drawingId: 'drawing',
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
  return { id: 'drawing', name: 'heroi', dataUrl, width: 1, height: 1, pintaImage, libRevision: 3 }
}

for (const kind of ['classic', 'pro'] as const) {
  test(`${kind}: two selected frames coexist and only the matching recipe updates`, async () => {
    const store = createProjectStore()
    const raw = documentFixture('python', kind)
    raw.assets = []
    store.getState().hydrateProject(await refinePythonProjectDocument(raw))
    expect(addPintaCreationToProject(store.getState(), imported(0))).toBeNull()
    expect(addPintaCreationToProject(store.getState(), imported(1))).toBeNull()
    const [first, second] = store.getState().project!.assets!
    expect(store.getState().project!.assets).toHaveLength(2)
    expect(first?.pintaImage?.recipe.selection).toEqual(imported(0).pintaImage.recipe.selection)
    expect(second?.pintaImage?.recipe.selection).toEqual(imported(1).pintaImage.recipe.selection)
    expect(first?.proPath).toBe('assets/heroi.png')
    expect(second?.proPath).toBe('assets/heroi-2.png')
    const next = imported(0)
    next.pintaImage.provenance.sourceSha256 = 'b'.repeat(64)
    next.libRevision = 4
    expect(addPintaCreationToProject(store.getState(), next)).toBeNull()
    expect(store.getState().project!.assets![1]).toEqual(second!)
    expect(store.getState().project!.assets![0]).toEqual({
      ...first!,
      pintaImage: next.pintaImage,
      libRevision: 4,
    })
    const before = store.getState().project
    const { pintaImage: _metadata, ...canonical } = imported(0)
    expect(addPintaCreationToProject(store.getState(), canonical)).toBeTruthy()
    expect(store.getState().project).toBe(before)
  })
}

test('review keeps the material identity; edits/removal and a concurrent addition win over late imports', async () => {
  const store = createProjectStore()
  const raw = documentFixture('python', 'pro')
  raw.assets = []
  store.getState().hydrateProject(await refinePythonProjectDocument(raw))
  expect(addPintaCreationToProject(store.getState(), imported(0))).toBeNull()
  const first = structuredClone(store.getState().project!.assets![0]!)
  expect(addPintaCreationToProject(store.getState(), imported(1), first)).toBeNull()
  const revised = store.getState().project!.assets![0]!
  expect(revised.id).toBe(first.id)
  expect(revised.name).toBe(first.name)
  expect(revised.proPath).toBe(first.proPath)
  expect(revised.pintaImage?.recipe.selection).toEqual(imported(1).pintaImage.recipe.selection)
  const before = store.getState().project
  expect(addPintaCreationToProject(store.getState(), imported(0), first)).toContain('mudou')
  expect(store.getState().project).toBe(before)
  const snapshot = structuredClone(revised)
  expect(store.getState().renameAsset(revised.id, 'nome-autoral')).toBeNull()
  const renamed = store.getState().project
  expect(addPintaCreationToProject(store.getState(), imported(0), snapshot)).toContain('mudou')
  expect(store.getState().project).toBe(renamed)
  store.getState().removeAsset(revised.id)
  expect(addPintaCreationToProject(store.getState(), imported(0), snapshot)).toContain('mudou')
  expect(store.getState().project?.assets).toEqual([])
  expect(addPintaCreationToProject(store.getState(), imported(0), null)).toBeNull()
  const concurrent = store.getState().project
  expect(addPintaCreationToProject(store.getState(), imported(0), null)).toContain('preparação')
  expect(store.getState().project).toBe(concurrent)
})
