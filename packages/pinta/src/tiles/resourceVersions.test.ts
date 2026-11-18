import { expect, it } from 'bun:test'
import { assetBytes } from '../core/assetMemory'
import { withMapResourceVersions } from '../core/mapResourceVersions'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  isObjectLayer,
  pintaAssetDependencyIds,
  sanitizePintaAsset,
} from '../core/project'
import { PINTA_RESOURCE_LIMITS } from '../core/projectConfig'
import { exportPintaScene } from '../export/scene'
import { createEditorStore, snapshotShared } from '../state/editorStore'
import { addMapObject, createMapObject, updateMapObject } from './mapObjects'
import { collectMapTilesets, resolveMapTilesets } from './mapTilesets'
import {
  captureMapResourceVersion,
  freezeMapTilesets,
  freezeObjectResource,
  linkMapTilesets,
  linkObjectResource,
  removeUnusedMapResourceVersions,
} from './resourceVersions'
import { addLayer, addObjectLayer } from './tilemapOps'
import '../testing/idbMock'
const { createPintaPersistence, capturePintaAssetForImage } = await import('../state/persistence')
const { createGalleryStore } = await import('../state/galleryStore')

import { createMapSet, detachMapSet, placeMapSet } from './sets'

function fixture() {
  const source = createPixelSpriteAsset({ name: 'arvore', frameSize: 16 })
  let map = addObjectLayer(
    createTilemapAsset({ name: 'vila', tilesetId: 'terra', cols: 2, rows: 2 }),
    'Árvores',
  )
  const layerId = map.layers.at(-1)!.id
  const object = createMapObject({
    shape: 'art',
    width: 16,
    height: 16,
    art: { assetId: source.id, animationId: source.animations[0]!.id },
  })
  map = addMapObject(map, layerId, object)
  return { map, source, object, layerId, find: (id: string) => (id === source.id ? source : null) }
}

it('peças guardadas tornam o mapa autocontido na galeria, captura, importação e cena', async () => {
  const a = createTilesetAsset({ name: 'terra', tileSize: 16 }),
    b = createTilesetAsset({ name: 'agua', tileSize: 16 })
  const map = addLayer(
    createTilemapAsset({ name: 'vila', tilesetId: a.id, cols: 2, rows: 2 }),
    'Água',
    b.id,
  )
  const byId = new Map([
      [a.id, a],
      [b.id, b],
    ]),
    find = (id: string) => byId.get(id) ?? null
  const frozen = freezeMapTilesets(map, find, 1)
  if (!frozen.ok) throw new Error(frozen.reason)
  expect(pintaAssetDependencyIds(frozen.map)).toEqual([])
  expect(collectMapTilesets(frozen.map, () => null)).toHaveLength(2)
  expect(resolveMapTilesets(frozen.map, []).every(Boolean)).toBe(true)
  a.tiles[0]!.data[0] = 3
  const sheet = withMapResourceVersions(frozen.map, () => null)(frozen.map.tilesetId)
  expect(sheet?.kind === 'tileset' && sheet.tiles[0]!.data[0]).toBe(0)
  const persistence = createPintaPersistence({ namespace: `versions-${map.id}` })
  await persistence.persistAsset(frozen.map)
  const captured = await capturePintaAssetForImage(map.id, { namespace: `versions-${map.id}` })
  expect(captured.ok).toBe(true)
  if (!captured.ok) throw new Error(captured.reason)
  expect(captured.tilesets).toHaveLength(2)
  const gallery = createGalleryStore(createPintaPersistence({ namespace: `import-${map.id}` }))
  expect(await gallery.getState().importAssets([frozen.map])).toMatchObject({
    added: 1,
    skipped: 0,
  })
  const scene = await exportPintaScene(
    frozen.map,
    () => null,
    async () => 'data:image/png;base64,teste',
  )
  expect(scene.tilesets).toHaveLength(2)
  const { importDrawingsForStudio } = await import('../export/studioLibrary')
  const { galleryToPintaJson } = await import('../export/projectJson')
  const json = galleryToPintaJson([frozen.map])
  const options = { namespace: `reused-${map.id}`, origin: 'example:resource-qa' }
  const first = await importDrawingsForStudio(json, [map.id], options)
  const again = await importDrawingsForStudio(json, [map.id], options)
  expect(first.ok).toBe(true)
  if (!first.ok || !again.ok) throw new Error('Import expected')
  expect(again.drawings[0]?.id).toBe(first.drawings[0]?.id)
  expect(again.drawings[0]?.reused).toBe(true)
  expect(again.drawings[0]?.imageSelection).toEqual(first.drawings[0]?.imageSelection)
  expect(
    (await createPintaPersistence({ namespace: options.namespace }).listAllAssets()).filter(
      (a) => a.kind === 'tilemap',
    ),
  ).toHaveLength(1)
  expect(linkMapTilesets(frozen.map, () => null)).toEqual({ ok: false, reason: 'missing' })
  const linked = linkMapTilesets(frozen.map, find)
  if (!linked.ok) throw new Error(linked.reason)
  expect(linked.map.tilesetId).toBe(a.id)
  const incompatible = { ...a, tileSize: 32 }
  expect(linkMapTilesets(frozen.map, (id) => (id === a.id ? incompatible : find(id)))).toEqual({
    ok: false,
    reason: 'layout-changed',
  })
})

it('soltar um conjunto materializa também as versões das artes dele', () => {
  const { map, source, object, layerId, find } = fixture()
  const frozen = freezeObjectResource(map, layerId, object.id, find)
  if (!frozen.ok) throw new Error(frozen.reason)
  const set = createMapSet(frozen.map, { col: 0, row: 0, cols: 2, rows: 2 }, 16, 'jardim')
  let target = addObjectLayer(
    createTilemapAsset({ name: 'mundo', tilesetId: 'terra', cols: 4, rows: 4 }),
    'Conjuntos',
  )
  const owner = target.layers.find(isObjectLayer)!
  target = placeMapSet(target, owner.id, set, 0, 0, 16)
  const instance = target.layers.find(isObjectLayer)!.objects[0]!
  const detached = detachMapSet(target, owner.id, instance.id, set, 16)
  expect(detached).not.toBe(target)
  expect(detached.resources).toEqual(frozen.map.resources)
  expect(pintaAssetDependencyIds(detached)).not.toContain(source.id)
  expect(sanitizePintaAsset(detached)?.kind).toBe('tilemap')
})

it('versão guardada não muda com a biblioteca; atualizar cria outra versão; voltar a acompanhar é explícito', () => {
  const { map, source, object, layerId, find } = fixture()
  const first = freezeObjectResource(map, layerId, object.id, find, 100)
  expect(first.ok).toBe(true)
  if (!first.ok) throw new Error(first.reason)
  const version = first.map.resources![0]!
  expect(version.asset.id).not.toBe(source.id)
  expect(withMapResourceVersions(first.map, find)(version.asset.id)).toBe(version.asset)
  expect(pintaAssetDependencyIds(first.map)).toEqual(['terra'])
  source.animations[0]!.frames[0]![0]!.data[0] = 3
  expect(
    version.asset.kind === 'pixel-sprite' && version.asset.animations[0]!.frames[0]![0]!.data[0],
  ).toBe(0)
  const updated = freezeObjectResource(first.map, layerId, object.id, find, 100)
  expect(updated.ok).toBe(true)
  if (!updated.ok) throw new Error(updated.reason)
  expect(updated.map.resources).toHaveLength(2)
  expect(updated.map.resources![1]!.asset.id).not.toBe(version.asset.id)
  expect(updated.map.resources![0]).toBe(version)
  const linked = linkObjectResource(updated.map, layerId, object.id, find)
  expect(linked.ok).toBe(true)
  if (!linked.ok) throw new Error(linked.reason)
  expect(pintaAssetDependencyIds(linked.map)).toContain(source.id)
  expect(removeUnusedMapResourceVersions(linked.map).resources).toBeUndefined()
  expect(source.animations[0]!.frames[0]![0]!.data[0]).toBe(3)
})

it('remover o original não impede ler/exportar a versão; não reconecta silenciosamente a arte ausente', () => {
  const { map, object, layerId, find } = fixture()
  const result = freezeObjectResource(map, layerId, object.id, find)
  if (!result.ok) throw new Error(result.reason)
  expect(sanitizePintaAsset(result.map)?.kind).toBe('tilemap')
  expect(linkObjectResource(result.map, layerId, object.id, () => null)).toEqual({
    ok: false,
    reason: 'missing',
  })
  const locked = {
    ...map,
    layers: map.layers.map((layer) =>
      layer.id === layerId ? { ...layer, locked: true as const } : layer,
    ),
  }
  expect(freezeObjectResource(locked, layerId, object.id, find)).toEqual({
    ok: false,
    reason: 'locked',
  })
  expect(map.resources).toBeUndefined()
})

it('memória física das versões e contagem são limitadas, mesmo quando os pixels comprimem muito', () => {
  const { map } = fixture()
  const source = createPixelSpriteAsset({ name: 'grande', frameSize: 128 })
  source.layers = Array.from({ length: 4 }, (_, i) => ({ ...source.layers[0]!, id: `l${i}` }))
  source.animations = Array.from({ length: 12 }, (_, i) => ({
    ...source.animations[0]!,
    id: `a${i}`,
    name: `animacao-${i}`,
    frames: Array.from({ length: 24 }, () =>
      Array.from({ length: 4 }, () => ({
        width: 128,
        height: 128,
        data: new Uint8Array(128 * 128),
      })),
    ),
  }))
  expect(assetBytes(source)).toBeGreaterThan(PINTA_RESOURCE_LIMITS.maxSnapshotBytes)
  expect(captureMapResourceVersion(map, source)).toEqual({ ok: false, reason: 'memory-budget' })
  expect(
    sanitizePintaAsset({
      ...map,
      schema: 6,
      resources: [{ sourceId: 'outro', capturedAt: 1, asset: source }],
    }) === null,
  ).toBe(true)
  let full = map
  const small = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  for (let i = 0; i < 32; i++) {
    const captured = captureMapResourceVersion(full, small)
    if (!captured.ok) throw new Error(captured.reason)
    full = captured.map
  }
  expect(captureMapResourceVersion(full, small)).toEqual({ ok: false, reason: 'version-limit' })
})

it('desfazer/refazer inclui o catálogo e mede a versão uma vez entre os snapshots', async () => {
  const { map, source, object, layerId, find } = fixture()
  const result = freezeObjectResource(map, layerId, object.id, find)
  if (!result.ok) throw new Error(result.reason)
  const store = createEditorStore({ asset: map, persist: async () => {}, autosaveDelayMs: 100000 })
  store.getState().commit(result.map)
  store.getState().undo()
  expect(store.getState().asset).toBe(map)
  store.getState().redo()
  const restored = store.getState().asset
  expect(restored.kind === 'tilemap' && restored.resources).toEqual(result.map.resources)
  const shared = [...snapshotShared({ asset: result.map, linkedMaps: [result.map] })]
  const payload = result.map.resources![0]!.asset
  const versions = shared.filter((part) => part.key === payload)
  expect(versions).toHaveLength(2)
  expect(versions.every((part) => part.bytes === assetBytes(source))).toBe(true)
  expect(isObjectLayer(result.map.layers.at(-1)!)).toBe(true)
  await store.getState().flush()
})

it('quarenta gestos não multiplicam os 4,5 MiB da mesma versão no orçamento do histórico', async () => {
  const { map, source, object, layerId, find } = fixture()
  source.frameWidth = source.frameHeight = 128
  source.animations = Array.from({ length: 12 }, (_, i) => ({
    ...source.animations[0]!,
    id: i === 0 ? source.animations[0]!.id : `a${i}`,
    name: `animacao-${i}`,
    frames: Array.from({ length: 24 }, () => [
      { width: 128, height: 128, data: new Uint8Array(128 * 128) },
    ]),
  }))
  const result = freezeObjectResource(map, layerId, object.id, find)
  if (!result.ok) throw new Error(result.reason)
  const store = createEditorStore({ asset: map, persist: async () => {}, autosaveDelayMs: 100000 })
  store.getState().commit(result.map)
  for (let i = 1; i <= 40; i++) {
    const current = store.getState().asset
    if (current.kind !== 'tilemap') throw new Error('Mapa esperado')
    store.getState().commit(updateMapObject(current, layerId, object.id, { x: i }))
  }
  let undos = 0
  while (store.getState().canUndo) {
    store.getState().undo()
    undos++
  }
  expect(undos).toBe(41)
  expect(store.getState().asset).toBe(map)
  await store.getState().flush()
})
