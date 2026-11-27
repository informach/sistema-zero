import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { getPersonalAsset } from '../asset-library/personal'
import {
  PINTA_REGIONAL_PERSONAL_CAPTURE,
  readPersonalRegionalMap,
  savePersonalRegionalMap,
} from '../asset-library/personalRegional'
import { createBlankProjectSnapshot } from '../core/blankProject'
import { admitPintaRegionalMaterial } from '../core/pintaRegionalMaterial'
import { gameTwoDManifest } from '../official-extensions/game-2d/manifest'
import { prepareJavaScriptRegionalMaterials } from '../runtime/javascript/pintaRegionalMaterials'
import {
  installPngImageBitmap,
  projectedSceneMaterial,
} from '../testing/pintaRegionalMaterialFixture'
import { prepareEditableStudioProject } from './editableProjectValidation'
import { loadProjectById, persistProject } from './persistence'
import { createProjectStorageScope } from './projectStorageRuntime'

let restoreBitmap: () => void
beforeAll(() => {
  restoreBitmap = installPngImageBitmap()
})
afterAll(() => restoreBitmap())
beforeEach(() => {
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() })
  Object.defineProperty(globalThis, 'IDBKeyRange', { configurable: true, value: IDBKeyRange })
})

for (const kind of ['hexagonal', 'isometric'] as const) {
  test(`${kind}: biblioteca, autoridade do projeto e runtime usam o PNG 6 integral`, async () => {
    const material = await projectedSceneMaterial(kind)
    const owner = {
      namespace: crypto.randomUUID(),
      capability: PINTA_REGIONAL_PERSONAL_CAPTURE,
    } as const
    const id = material.regional.sourceId
    const input = {
      id,
      name: material.name,
      dataUrl: material.dataUrl,
      width: material.width,
      height: material.height,
    }
    expect((await savePersonalRegionalMap(input, { ...owner, expectedRevision: null })).ok).toBe(
      true,
    )
    expect(await readPersonalRegionalMap(id, owner)).toMatchObject({
      dataVersion: 6,
      dataUrl: material.dataUrl,
    })
    expect(await getPersonalAsset(id, owner)).toMatchObject({ regional: material.regional })
    const scope = createProjectStorageScope(owner.namespace)
    const project = {
      ...createBlankProjectSnapshot('projetado', material.name),
      assets: [material],
      installedExtensions: [
        { id: gameTwoDManifest.id, version: gameTwoDManifest.version, installedAt: 1 },
      ],
    }
    await persistProject(project, {}, scope)
    const reopened = await prepareEditableStudioProject(
      await loadProjectById(project.id, createProjectStorageScope(owner.namespace)),
    )
    expect(reopened?.assets).toEqual(project.assets)
    const runtime = await prepareJavaScriptRegionalMaterials(
      reopened!.assets,
      reopened!.installedExtensions,
      scope,
    )
    const scene = runtime?.worlds[0]?.maps.get(id)?.data.scene
    expect(scene?.version).toBe(5)
    if (scene?.version !== 5) throw Error('Projeção perdida')
    expect(scene.projection.kind).toBe(kind)
    const wire = JSON.parse(runtime!.wire[0]!)
    expect(wire.rootId).toBe(id)
    expect(wire.scenes[0].projection).toEqual(scene.projection)
    expect(
      wire.scenes[0].layers.find((layer: { kind: string }) => layer.kind === 'tiles').cells
        .encoding,
    ).toBe(kind === 'hexagonal' ? 'u32le-base64-v1' : 'i16le-base64-v1')
    await expect(
      admitPintaRegionalMaterial({
        dataUrl: material.dataUrl,
        sourceId: id,
        width: material.width,
        height: material.height,
        regional: { ...material.regional, dataVersion: 5 },
      }),
    ).rejects.toThrow()
    const stale = (await readPersonalRegionalMap(id, owner))!
    expect(
      (
        await savePersonalRegionalMap(input, {
          ...owner,
          expectedRevision: '00000000-0000-4000-8000-000000000000',
        })
      ).ok,
    ).toBe(false)
    expect((await readPersonalRegionalMap(id, owner))?.revision).toBe(stale.revision)
  })
}
