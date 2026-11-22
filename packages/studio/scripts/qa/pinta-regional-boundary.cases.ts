// Explicit QA probe for the pre-promotion boundary. Three assertions intentionally fail on 0127c6a7d.
import { beforeAll, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { IDBFactory } from 'fake-indexeddb'
import { createStore, get, set } from 'idb-keyval'
import { scene4Fixture } from '../../../core/tests/fixtures/pinta-region-scene'
import { pngWithPintaData } from '../../../pinta/src/export/pngText'
import { embedPintaRegionImage } from '../../../pinta/src/export/regionImage'
import { readPintaRegionImageWorld } from '../../../pinta/src/export/regionImageWorld'
import { getPersonalAsset, savePersonalAsset } from '../../src/asset-library/personal'
import { mergeDrawingIntoAsset } from '../../src/asset-library/personalAssetMerge'
import { readPintaImageAssetMetadata } from '../../src/core/pintaImageAsset'
import { assertPintaPngReaderContract } from '../../src/core/pintaPngData'
import {
  assetManifest,
  assetMetaManifest,
  type ProjectAsset,
  sanitizeProjectAssets,
} from '../../src/core/projectAssets'
import { buildAssetsRuntime } from '../../src/preview/assetsBridge'
import { readValues } from '../../src/state/idbTransaction'
import {
  loadProjectAssetsSnapshotById,
  loadProjectById,
  persistProjectAssets,
} from '../../src/state/persistence'
import {
  projectAssetsKey,
  projectBlocksKey,
  projectFilesKey,
  projectMetaKey,
  projectStateKey,
} from '../../src/state/projectStorageKeys'
import type { ProjectStorageScope } from '../../src/state/projectStorageRuntime'

const { createCanvas, loadImage } = createRequire(
  new URL('../../../pinta/package.json', import.meta.url),
)('@napi-rs/canvas')
const base64 = (bytes: Uint8Array) =>
  `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const blue = (w: number, h: number) => {
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#2643ac'
  ctx.fillRect(0, 0, w, h)
  return new Uint8Array(canvas.toBuffer('image/png'))
}
const source = scene4Fixture()
const cover = blue(64, 32)
const sheet = base64(blue(64, 16))
const wire = {
  ...source,
  physics: 'precise',
  tilesets: source.tilesets.map((value) => ({ ...value, image: sheet })),
  art: source.art.map((value) => ({ ...value, image: base64(blue(value.width, value.height)) })),
}
const legacy = {
  version: 1 as const,
  id: 'vila-antiga',
  name: 'Vila antiga',
  tileSize: 16,
  cols: 1,
  rows: 1,
  tilesets: [
    { id: 'ground', name: 'Chão', image: sheet, columns: 4, count: 4, solid: [0], platform: [] },
  ],
  layers: [
    {
      id: 'floor',
      kind: 'tiles' as const,
      name: 'Chão',
      visible: true,
      tilesetId: 'ground',
      cells: [0],
    },
  ],
}
const asset: ProjectAsset = {
  id: 'original-asset-id',
  name: 'vila-do-jogo',
  kind: 'image',
  source: 'library',
  libId: 'personal:world',
  libOrigin: 'pinta',
  libRevision: 1,
  dataUrl: base64(cover),
  width: 64,
  height: 32,
  scene: legacy,
}
const namespace = () => `pinta-regional-boundary-${crypto.randomUUID()}`
const files = { 'script.js': 'SZGame2D.createMapScene("mapa", "vila-do-jogo");' }
const blocksState = {
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: 'map_scene_create',
        id: 'my-held-block',
        fields: { ASSET: 'vila-do-jogo' },
      },
    ],
  },
}
let png5: Uint8Array
let dataUrl: string

beforeAll(async () => {
  // Real IndexedDB API over a private in-memory database. No mock package.
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
  const cabana = await embedPintaRegionImage(
    cover,
    JSON.stringify({ ...wire, id: 'cabana', name: 'Cabana' }),
  )
  const root = await embedPintaRegionImage(cover, JSON.stringify(wire), {
    world: {
      version: 1,
      rootId: 'world',
      maps: [{ id: 'cabana', name: 'Cabana', png: base64(cabana.png) }],
    },
  })
  png5 = root.png
  dataUrl = base64(png5)
  if (process.env.PINTA_REGION_BROWSER_FIXTURE === '1') {
    const png4 = await pngWithPintaData(cover, {
      format: 'pinta',
      kind: 'map',
      version: 4,
      name: legacy.name,
      scale: 1,
      tileSize: 16,
      cols: 1,
      rows: 1,
      tilesets: [{ name: 'Chão', y: 0, columns: 4, count: 4, solid: [0], platform: [] }],
      layers: [
        { type: 'tiles', name: 'Chão', visible: true, front: false, tileset: 0, cells: [0] },
      ],
      scene: legacy,
    })
    await Bun.write(
      '.cache/pinta-regional-browser-fixture.json',
      JSON.stringify({
        current: {
          id: 'world',
          name: 'vila',
          kind: 'image',
          origin: 'pinta',
          width: 64,
          height: 32,
          updatedAt: 2,
          dataUrl,
          scene: wire,
          regional: { dataVersion: 5, sha256: hash(png5) },
        },
        previous: {
          id: 'world',
          name: 'vila',
          kind: 'image',
          width: 64,
          height: 32,
          updatedAt: 1,
          dataUrl: base64(png4),
          scene: legacy,
        },
        previousSha256: hash(png4),
      }),
    )
  }
})

async function persistedParts(material: unknown) {
  const id = 'teste-jogo-regional'
  const identity = namespace()
  const store = createStore(identity, 'kv')
  const scope: ProjectStorageScope = { identity, namespace: '', store }
  await set(
    projectMetaKey(id),
    { id, name: 'Jogo', kind: 'classic', mode: 'bridge', storageVersion: 4 },
    store,
  )
  await set(projectAssetsKey(id), { id, assets: [material] }, store)
  await set(projectFilesKey(id), { id, files }, store)
  await set(projectBlocksKey(id), { id, blocksState }, store)
  await set(projectStateKey(id), { id, ir: null }, store)
  return { id, scope }
}

test('controle positivo: PNG 5 tem IDAT real, Scene 4 e segundo PNG capturado', async () => {
  const admitted = readPintaRegionImageWorld(png5)
  expect(admitted.rootId).toBe('world')
  expect([...admitted.maps.keys()]).toEqual(['world', 'cabana'])
  expect(admitted.maps.get('world')?.data.scene.origin).toEqual(wire.origin)
  expect(admitted.maps.get('world')?.data.scene.version).toBe(4)
  expect(hash(admitted.maps.get('world')!.png)).toBe(hash(png5))
  for (const image of [...admitted.maps.values(), ...admitted.images.values()]) {
    expect((await loadImage(Buffer.from(image.png))).width).toBe(image.width)
  }
})

test('controle de preservação: leitura da partição de projeto recusa Scene 4 e mantém bytes, arquivos e blocos', async () => {
  const material = { ...asset, dataUrl, scene: wire }
  expect(sanitizeProjectAssets([material])[0]).toMatchObject({ dataUrl })
  expect(sanitizeProjectAssets([material])[0]?.scene).toBeUndefined()
  const { id, scope } = await persistedParts(material)
  await expect(loadProjectAssetsSnapshotById(id, scope)).rejects.toThrow(
    'Nenhuma cópia foi gravada',
  )
  expect(
    await readValues(scope.store, [
      projectAssetsKey(id),
      projectFilesKey(id),
      projectBlocksKey(id),
    ]),
  ).toEqual([
    { id, assets: [material] },
    { id, files },
    { id, blocksState },
  ])
})

test('controle de escrita: biblioteca recusa Scene 4 explícita e conserva revisão canônica anterior', async () => {
  const options = { namespace: namespace() }
  const input = { id: 'world', name: 'vila', width: 64, height: 32 }
  expect(
    (await savePersonalAsset({ ...input, dataUrl: asset.dataUrl, scene: legacy }, options)).ok,
  ).toBe(true)
  const before = await getPersonalAsset(input.id, options)
  const next = await savePersonalAsset({ ...input, dataUrl, scene: wire }, options)
  expect(next.ok).toBe(false)
  expect(await getPersonalAsset(input.id, options)).toEqual(before)
})

test('controle de atualização suportada: partição fechada grava arte e conserva nome, ID, código e blocos', async () => {
  const { id, scope } = await persistedParts(asset)
  const { assets } = await loadProjectAssetsSnapshotById(id, scope)
  const updated = mergeDrawingIntoAsset(assets[0]!, {
    id: 'world',
    name: 'renomeado-no-pinta',
    kind: 'image',
    dataUrl: base64(blue(32, 64)),
    width: 32,
    height: 64,
    updatedAt: 2,
    scene: { ...legacy, id: 'novo' },
  })
  expect(updated).toMatchObject({
    id: asset.id,
    name: asset.name,
    libId: asset.libId,
    libRevision: 2,
  })
  expect(await persistProjectAssets(id, [updated!], scope, assets)).toBe(true)
  const stored = await loadProjectById(id, scope)
  expect(stored?.assets).toEqual([updated])
  expect(stored?.files).toEqual(files)
  expect(stored?.blocksState).toEqual(blocksState)
})

test('controle Python: derivada marcada não passa por receita/reader antigos', async () => {
  const derivation = {
    recipe: {
      version: 2 as const,
      algorithm: 'pinta-image-1' as const,
      drawingId: 'world',
      selection: { kind: 'map-world' as const },
      scale: 1,
    },
    provenance: { sourceSha256: 'a'.repeat(64), dependencies: [] },
    output: {
      mime: 'image/png' as const,
      width: 64,
      height: 32,
      bytes: png5.byteLength,
      sha256: hash(png5),
    },
  }
  const candidate = { ...asset, dataUrl, scene: undefined }
  expect(() =>
    readPintaImageAssetMetadata({
      ...candidate,
      pintaImage: { ...derivation, output: { ...derivation.output, dataVersion: 5 } },
    }),
  ).toThrow()
  await expect(assertPintaPngReaderContract(png5, derivation)).rejects.toThrow(
    'O original foi preservado',
  )
})

test('RED biblioteca: registro futuro não deve virar capa comum nem ser sobrescrito por upsert legado', async () => {
  const owner = namespace()
  const store = createStore(`sistema-zero-personal-assets-${owner}`, 'kv')
  const raw = {
    id: 'world',
    name: 'vila',
    origin: 'pinta',
    kind: 'image',
    dataUrl,
    width: 64,
    height: 32,
    updatedAt: 2,
    scene: wire,
  }
  await set('asset:world', raw, store)
  const read = await getPersonalAsset('world', { namespace: owner })
  expect(await get('asset:world', store)).toEqual(raw)
  const update = await savePersonalAsset(
    { id: raw.id, name: raw.name, dataUrl: asset.dataUrl, width: 64, height: 32, scene: legacy },
    { namespace: owner },
  )
  const after = await get<typeof raw>('asset:world', store)
  expect({
    readAsPlainCover: read !== null && read.scene === undefined,
    acceptedLegacyOverwrite: update.ok,
    exactPngPreserved: after?.dataUrl === dataUrl,
  }).toEqual({
    readAsPlainCover: false,
    acceptedLegacyOverwrite: false,
    exactPngPreserved: true,
  })
})

test('RED atualização: PNG 5 sem marcador não deve atualizar bytes reaproveitando cena velha', async () => {
  const options = { namespace: namespace() }
  expect(
    (
      await savePersonalAsset(
        { id: 'world', name: 'vila', dataUrl, width: 64, height: 32 },
        options,
      )
    ).ok,
  ).toBe(true)
  const read = await getPersonalAsset('world', options)
  expect(read?.dataUrl).toBe(dataUrl)
  const { id, scope } = await persistedParts(asset)
  const { assets } = await loadProjectAssetsSnapshotById(id, scope)
  const merged = mergeDrawingIntoAsset(assets[0]!, read!)
  if (merged) {
    const written = await persistProjectAssets(id, [merged], scope, assets)
    expect(written).toBe(true)
  }
  const stored = await loadProjectById(id, scope)
  expect(stored?.files).toEqual(files)
  expect(stored?.blocksState).toEqual(blocksState)
  const current = await loadProjectAssetsSnapshotById(id, scope)
  expect(current.assets[0]?.dataUrl === dataUrl && current.assets[0]?.scene?.id === legacy.id).toBe(
    false,
  )
})

test('RED preview: destino de cenário mantém PNG 5 mas perde o sinal de cena', () => {
  const input: ProjectAsset = { ...asset, dataUrl, scene: wire as unknown as ProjectAsset['scene'] }
  const meta = assetMetaManifest([input], { code: files['script.js'] })
  expect(meta[asset.name]).toBeDefined()
  const window: Record<string, Record<string, unknown>> = {}
  new Function('window', buildAssetsRuntime(assetManifest([input]), meta))(window)
  expect(window.__SZGAME_ASSETS?.[asset.name]).toBe(dataUrl)
  expect(window.__SZGAME_ASSET_META?.[asset.name]).toBeDefined()
})
