import { afterAll, beforeAll, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import { IDBFactory, IDBObjectStore as TestObjectStore } from 'fake-indexeddb'
import { createStore, get, keys, set } from 'idb-keyval'
import { scene4Fixture } from '../../../core/tests/fixtures/pinta-region-scene'
import { embedPintaRegionImage } from '../../../pinta/src/export/regionImage'
import { encodeAssetBase64 } from '../core/assetBinary'
import { assetMetaManifest, type ProjectAsset, sanitizeProjectAssets } from '../core/projectAssets'
import { buildAssetsRuntime } from '../preview/assetsBridge'
import { readValues, writeInOneTransaction } from '../state/idbTransaction'
import { loadProjectAssetsSnapshotById } from '../state/persistence'
import {
  projectAssetsKey,
  projectBlocksKey,
  projectFilesKey,
  projectMetaKey,
} from '../state/projectStorageKeys'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import {
  getPersonalAsset,
  getPersonalAssets,
  listPersonalAssets,
  PERSONAL_ASSET_LIMITS,
  personalAssetsChangeToken,
  removePersonalAsset,
  savePersonalAsset,
  savePersonalAssetBundle,
  setPersonalAssetsNamespace,
} from './personal'
import { mergeDrawingIntoAsset } from './personalAssetMerge'
import {
  PINTA_REGIONAL_PERSONAL_CAPTURE,
  readPersonalRegionalMap,
  savePersonalRegionalMap,
} from './personalRegional'
import { reconcileDrawingsFromRestoredProject } from './personalSync'

const { createCanvas } = createRequire(new URL('../../../pinta/package.json', import.meta.url))(
  '@napi-rs/canvas',
)
const asPngBytes = (width: number, height: number) =>
  new Uint8Array(createCanvas(width, height).toBuffer('image/png'))
const url = (bytes: Uint8Array) => `data:image/png;base64,${encodeAssetBase64(bytes)}`
const root = scene4Fixture()
const cover = asPngBytes(64, 32)
const legacy = { id: 'world', name: 'vila', dataUrl: url(cover), width: 64, height: 32 }
let capture: typeof legacy
const capability = PINTA_REGIONAL_PERSONAL_CAPTURE
const idb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
const scope = (): { namespace: string; capability: typeof capability } => ({
  namespace: `regional-personal-${crypto.randomUUID()}`,
  capability,
})
const ownDb = ({ namespace }: { namespace: string }) =>
  createStore(`sistema-zero-personal-assets-${namespace}`, 'kv')

beforeAll(async () => {
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
  const result = await embedPintaRegionImage(
    cover,
    JSON.stringify({
      ...root,
      physics: 'precise',
      tilesets: root.tilesets.map((t) => ({ ...t, image: url(asPngBytes(64, 16)) })),
      art: root.art.map((a) => ({ ...a, image: url(asPngBytes(a.width, a.height)) })),
    }),
  )
  capture = { ...legacy, dataUrl: url(result.png) }
})

afterAll(() => {
  setPersonalAssetsNamespace('')
  if (idb) Object.defineProperty(globalThis, 'indexedDB', idb)
  else Reflect.deleteProperty(globalThis, 'indexedDB')
})

test('the private PNG 5 key survives a published-writer shadow and ordinary library operations', async () => {
  const owner = scope(),
    db = ownDb(owner)
  expect((await savePersonalAsset(legacy, owner)).ok).toBe(true)
  expect((await savePersonalRegionalMap(capture, { ...owner, expectedRevision: null })).ok).toBe(
    true,
  )
  expect(await keys(db)).toEqual(['region-map:world'])
  expect(await readPersonalRegionalMap('world', owner)).toMatchObject({
    dataUrl: capture.dataUrl,
    dataVersion: 5,
  })

  await set('asset:world', { ...legacy, updatedAt: Number.MAX_SAFE_INTEGER }, db)
  expect(await getPersonalAsset('world', owner)).toBeNull()
  expect((await getPersonalAssets(['world'], owner)).get('world')).toBeNull()
  expect(await listPersonalAssets(owner)).toEqual([])
  const image: ProjectAsset = {
    id: 'original-material',
    name: 'nome-nos-blocos',
    dataUrl: legacy.dataUrl,
    kind: 'image',
    source: 'library',
    libId: 'personal:world',
    libOrigin: 'pinta',
  }
  const restored = { assets: [image], updatedAt: 1 }
  expect(await reconcileDrawingsFromRestoredProject(restored, owner)).toEqual({
    projectChanged: false,
  })
  expect(restored.assets[0]).toBe(image)
  expect((await savePersonalAsset(legacy, owner)).ok).toBe(false)
  expect((await removePersonalAsset('world', owner)).ok).toBe(false)
  expect((await savePersonalAssetBundle([{ ...legacy, id: 'neighbor' }, legacy], owner)).ok).toBe(
    false,
  )
  expect(await get('asset:neighbor', db)).toBeUndefined()
  expect(await readPersonalRegionalMap('world', owner)).toMatchObject({ dataUrl: capture.dataUrl })
})

test('an opaque regional marker in a legacy row is kept intact instead of becoming a normal image', async () => {
  const owner = scope()
  const db = ownDb(owner)
  const future = { ...capture, updatedAt: 2, regional: { dataVersion: 9 } }
  await set('asset:world', future, db)
  expect(await getPersonalAsset('world', owner)).toBeNull()
  expect((await savePersonalAsset(legacy, owner)).ok).toBe(false)
  expect((await removePersonalAsset('world', owner)).ok).toBe(false)
  expect(await get('asset:world', db)).toEqual(future)
})

test('competing writers observe one real revision and a switched namespace cannot redirect a write', async () => {
  const owner = scope(),
    other = scope()
  setPersonalAssetsNamespace(owner.namespace)
  const pending = savePersonalRegionalMap(capture, { capability, expectedRevision: null })
  setPersonalAssetsNamespace(other.namespace)
  expect((await pending).ok).toBe(true)
  expect(await readPersonalRegionalMap('world', other)).toBeNull()
  const before = (await readPersonalRegionalMap('world', owner))!
  expect(before.dataUrl).toBe(capture.dataUrl)
  const attempts = await Promise.all(
    ['A', 'B'].map((letter) =>
      savePersonalRegionalMap(
        { ...capture, name: letter },
        { ...owner, expectedRevision: before.revision },
      ),
    ),
  )
  expect(attempts.map((a) => a.ok).sort()).toEqual([false, true])
  const after = await readPersonalRegionalMap('world', owner)
  expect(after?.revision).not.toBe(before.revision)
  expect(after?.dataUrl).toBe(before.dataUrl)
  await expect(
    readPersonalRegionalMap('world', { ...owner, capability: 'future' as typeof capability }),
  ).resolves.toBeNull()
})

test('abort at the last put leaves both canonical rows and the change signal untouched', async () => {
  const owner = scope(),
    db = ownDb(owner)
  await savePersonalAsset(legacy, owner)
  const baseline = await get('asset:world', db)
  const marker = personalAssetsChangeToken(owner.namespace)
  const put = TestObjectStore.prototype.put
  TestObjectStore.prototype.put = function (this: IDBObjectStore, value, key) {
    if (key === 'asset:last') throw new DOMException('Last request failed', 'QuotaExceededError')
    return put.call(this, value, key)
  }
  try {
    const outcome = await savePersonalAssetBundle(
      [
        { ...legacy, dataUrl: url(asPngBytes(16, 16)) },
        { ...legacy, id: 'last' },
      ],
      owner,
    )
    expect(outcome.ok).toBe(false)
  } finally {
    TestObjectStore.prototype.put = put
  }
  expect(await get('asset:world', db)).toEqual(baseline)
  expect(await get('asset:last', db)).toBeUndefined()
  expect(personalAssetsChangeToken(owner.namespace)).toBe(marker)
  const abort = new AbortController()
  const candidate = savePersonalRegionalMap(capture, {
    ...owner,
    expectedRevision: null,
    signal: abort.signal,
  })
  abort.abort()
  expect((await candidate).ok).toBe(false)
  expect(await keys(db)).toEqual(['asset:world'])
})

test('quota includes a protected future ID and atomic promotion can replace the existing slot', async () => {
  const owner = scope(),
    db = ownDb(owner)
  const future = { version: 9, dataUrl: capture.dataUrl }
  const ids = Array.from(
    { length: PERSONAL_ASSET_LIMITS.maxCount - 1 },
    (_, index) => `legacy-${index}`,
  )
  await writeInOneTransaction(db, {
    puts: [
      ...ids.map((id) => [`asset:${id}`, { ...legacy, id, name: id, updatedAt: 1 }] as const),
      ['region-map:world', future],
    ],
  })
  expect((await savePersonalAsset({ ...legacy, id: 'extra' }, owner)).ok).toBe(false)
  expect((await savePersonalRegionalMap(capture, { ...owner, expectedRevision: null })).ok).toBe(
    false,
  )
  expect(await readPersonalRegionalMap('world', owner)).toBeNull()
  expect(await get('region-map:world', db)).toEqual(future)
  expect(await listPersonalAssets(owner)).toHaveLength(ids.length)

  // Use the same valid PNG under a different namespace with a full legacy catalog.
  const another = scope(),
    anotherDb = ownDb(another)
  await writeInOneTransaction(anotherDb, {
    puts: [
      ...ids.map((id) => [`asset:${id}`, { ...legacy, id, name: id, updatedAt: 1 }] as const),
      ['asset:world', { ...legacy, updatedAt: 1 }],
    ],
  })
  expect((await savePersonalRegionalMap(capture, { ...another, expectedRevision: null })).ok).toBe(
    true,
  )
  expect(await keys(anotherDb)).toHaveLength(PERSONAL_ASSET_LIMITS.maxCount)
})

test('the combined byte quota includes opaque regional bytes before either writer can allocate', async () => {
  const owner = scope(),
    db = ownDb(owner)
  const usage = 'X'.repeat(PERSONAL_ASSET_LIMITS.maxTotalChars - 1)
  await set('region-map:future', { version: 9, dataUrl: usage }, db)
  expect((await savePersonalAsset(legacy, owner)).ok).toBe(false)
  expect((await savePersonalRegionalMap(capture, { ...owner, expectedRevision: null })).ok).toBe(
    false,
  )
  expect(await keys(db)).toEqual(['region-map:future'])
})

test('regional authority cannot take the slot of a Molda creation with the same ID', async () => {
  const owner = scope(),
    db = ownDb(owner)
  expect((await savePersonalAsset({ ...legacy, origin: 'molda' }, owner)).ok).toBe(true)
  const before = await getPersonalAsset(legacy.id, owner)
  expect(before?.origin).toBe('molda')
  expect((await savePersonalRegionalMap(capture, { ...owner, expectedRevision: null })).ok).toBe(
    false,
  )
  expect(await keys(db)).toEqual(['asset:world'])
  expect(await getPersonalAsset(legacy.id, owner)).toEqual(before)
})

test('old project readers reject the protected reference without touching code, blocks or its PNG', async () => {
  const ns = scope(),
    store = ownDb(ns),
    id = 'game'
  const projectScope: ProjectStorageScope = {
    identity: ns.namespace,
    namespace: ns.namespace,
    store,
  }
  const image: ProjectAsset = {
    id: 'source-asset-id',
    name: 'vila',
    source: 'library',
    libId: 'personal:world',
    kind: 'image',
    ...{ dataUrl: legacy.dataUrl, width: 64, height: 32 },
  }
  const protectedImage = { ...image, dataUrl: capture.dataUrl, regional: { dataVersion: 5 } }
  const files = { 'script.js': 'SZGame2D.createMapScene("mapa", "vila");' }
  const blocksState = { blocks: { blocks: [{ id: 'original-id', type: 'map_scene_create' }] } }
  await set(projectMetaKey(id), { id, storageVersion: 4, name: 'game' }, store)
  await set(projectAssetsKey(id), { id, assets: [protectedImage] }, store)
  await set(projectFilesKey(id), { id, files }, store)
  await set(projectBlocksKey(id), { id, blocksState }, store)
  expect(() => sanitizeProjectAssets([protectedImage])).toThrow('O original foi preservado')
  expect(() => assetMetaManifest([protectedImage])).toThrow('O original foi preservado')
  expect(() => buildAssetsRuntime({ vila: capture.dataUrl }, { vila: protectedImage })).toThrow(
    'O original foi preservado',
  )
  expect(mergeDrawingIntoAsset(image, { ...capture, kind: 'image', updatedAt: 2 })).toBeNull()
  expect((await savePersonalAsset(capture, ns)).ok).toBe(false)
  await expect(loadProjectAssetsSnapshotById(id, projectScope)).rejects.toThrow(
    'O original foi preservado',
  )
  expect(
    await readValues(store, [projectAssetsKey(id), projectFilesKey(id), projectBlocksKey(id)]),
  ).toEqual([
    { id, assets: [protectedImage] },
    { id, files },
    { id, blocksState },
  ])
})
