import { expect, test } from 'bun:test'
import { vilaEFloresta } from '../../scripts/homologacao/fixture'
import {
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  type MapSetAsset,
  type PintaAsset,
  pintaAssetDependencyIds,
} from '../core/project'
import { regionVila } from '../testing/regionVila'
import { CELL_FLIP_D, CELL_FLIP_H, makeCell } from '../tiles/cell'
import { createMapObject } from '../tiles/mapObjects'
import { addLayer, addObjectLayer } from '../tiles/tilemapOps'
import { assetToJson } from './assetJson'
import { inspectPintaCausalDocument } from './pintaCausalManifest'
import { encodeRegionGalleryBackup } from './regionBackup'

function inspect(asset: PintaAsset, text = assetToJson(asset), formatVersion = 6) {
  return inspectPintaCausalDocument(text, { itemId: asset.id, kind: asset.kind, formatVersion })
}

test('extracts the exact live IDs and both authorial door selectors from Vila and Cabana', () => {
  const { assets, map, cabana } = vilaEFloresta()
  for (const asset of assets) {
    const result = inspect(asset)
    expect(result?.manifest.itemId).toBe(asset.id)
    expect(result?.manifest.kind).toBe(asset.kind)
    expect(result?.manifest.refs.map((ref) => ref.id)).toEqual(
      pintaAssetDependencyIds(asset).sort(),
    )
  }
  expect(inspect(map)?.manifest.doorSelectors).toEqual(['cabana'])
  expect(inspect(cabana)?.manifest.doorSelectors).toEqual([map.name])
})

test('separates private snapshots from live sheet, art, set and typed property edges', () => {
  const privateSheet = {
    ...createTilesetAsset({ name: 'terra', tileSize: 16 }),
    id: 'ground-fixed',
    tileProperties: { '0': { unlock: { type: 'asset' as const, value: 'key-art' } } },
  }
  let map = addObjectLayer(
    addLayer(
      createTilemapAsset({ name: 'vila', tilesetId: privateSheet.id, cols: 2, rows: 1 }),
      'Água',
      'water',
    ),
    'Portas',
  )
  const layer = map.layers.find((layer) => layer.kind === 'objects')!
  layer.visible = false
  layer.objects.push(
    createMapObject({
      id: 'door-id',
      role: 'door',
      properties: { destino: { type: 'asset', value: 'cabin' }, destination: 'ignored' },
    }),
    createMapObject({
      id: 'door-name',
      role: 'door',
      properties: { destination: 'cabana-do-lago' },
    }),
    createMapObject({ id: 'draft', role: 'door', properties: { destino: '' } }),
    createMapObject({ id: 'water-art', shape: 'art', art: { assetId: 'water', tile: 12 } }),
    createMapObject({ id: 'water-implicit', shape: 'art', art: { assetId: 'water' } }),
    createMapObject({
      id: 'private-art',
      shape: 'art',
      art: { assetId: privateSheet.id, tile: 0 },
    }),
    createMapObject({ id: 'set', shape: 'set', setId: 'bridge' }),
  )
  const water = map.layers.filter(isTileLayer)[1]!
  water.cells.set([makeCell(2, CELL_FLIP_H | CELL_FLIP_D), -1])
  map = { ...map, resources: [{ sourceId: 'ground-live', capturedAt: 1, asset: privateSheet }] }

  const manifest = inspect(map)?.manifest
  expect(manifest).toMatchObject({
    nativeSchema: 6,
    requiredNativeSchema: 6,
    backupVersion: 6,
    embeddedDefaultLayout: { kind: 'tileset', tileSize: 16 },
    doorSelectors: ['cabana-do-lago', 'cabin'],
    refs: [
      { id: 'bridge', roles: ['set'] },
      { id: 'cabin', roles: ['property'] },
      { id: 'key-art', roles: ['property'] },
      {
        id: 'water',
        roles: ['art', 'layer-sheet'],
        indices: `0410${'00'.repeat(30)}`,
        implicitArtSlotZero: true,
      },
    ],
  })
  const set: MapSetAsset = {
    id: 'definition',
    kind: 'map-set',
    name: 'definition',
    schema: 6,
    createdAt: 1,
    updatedAt: 1,
    map: {
      ...map,
      layers: map.layers.map((l) =>
        l.kind === 'objects' ? { ...l, objects: l.objects.filter((object) => !object.setId) } : l,
      ),
    },
  }
  expect(inspect(set)?.manifest).toMatchObject({
    itemId: 'definition',
    kind: 'map-set',
    doorSelectors: manifest?.doorSelectors,
    embeddedDefaultLayout: manifest?.embeddedDefaultLayout,
    refs: manifest?.refs.filter((ref) => ref.id !== 'bridge'),
  })
})

test('reads real writer envelopes 1 to 7 and keeps native and cloud format axes separate', () => {
  const base = createTilemapAsset({ name: 'vila', tilesetId: 'ground', cols: 2, rows: 2 })
  const withoutProps = addObjectLayer(base, 'Objetos')
  const grouped = {
    ...base,
    layers: [...base.layers, { id: 'g', kind: 'group' as const, name: 'Grupo', visible: true }],
  }
  const withProperties = {
    ...base,
    layers: [
      { ...base.layers[0]!, properties: { target: { type: 'asset' as const, value: 'alvo' } } },
    ],
  }
  const fraction = { ...base, layers: [{ ...base.layers[0]!, offsetX: 1.5 }] }
  const frozen = {
    ...base,
    resources: [
      {
        sourceId: 'other-ground',
        capturedAt: 1,
        asset: { ...createTilesetAsset({ name: 'ground', tileSize: 16 }), id: 'ground' },
      },
    ],
  }
  const collision = { ...base, physics: 'precise' as const }
  const assets = [base, withoutProps, grouped, withProperties, fraction, frozen, collision]
  const schemas = [0, 0, 3, 4, 5, 6, 7]
  const cloudVersions = [1, 1, 2, 3, 4, 5, 6]
  for (const [index, asset] of assets.entries()) {
    const formatVersion = cloudVersions[index]!
    const result = inspect(asset, assetToJson(asset), formatVersion)
    expect(result?.manifest).toMatchObject({
      backupVersion: index + 1,
      nativeSchema: schemas[index],
      requiredNativeSchema: schemas[index],
    })
    if (formatVersion > 1) expect(inspect(asset, assetToJson(asset), formatVersion - 1)).toBeNull()
  }
})

test('uses the sparse regional codec only when explicitly selected', () => {
  const { map, assets } = regionVila()
  for (const asset of [map, assets.find((candidate) => candidate.kind === 'map-set')!]) {
    const backup = encodeRegionGalleryBackup([asset])
    expect(backup).not.toBeNull()
    const expected = { itemId: asset.id, kind: asset.kind, formatVersion: 7 }
    expect(inspectPintaCausalDocument(backup!.text, expected)).toBeNull()
    expect(
      inspectPintaCausalDocument(backup!.text, {
        ...expected,
        formatVersion: 6,
        allowRegions: true,
      }),
    ).toBeNull()
    const result = inspectPintaCausalDocument(backup!.text, { ...expected, allowRegions: true })
    expect(result?.manifest).toMatchObject({
      itemId: asset.id,
      backupVersion: 8,
      nativeSchema: 8,
      requiredNativeSchema: 8,
    })
    expect(result?.manifest.refs.map((ref) => ref.id)).toEqual(
      pintaAssetDependencyIds(asset).sort(),
    )
  }
})

test('refuses future, mismatched, lossily repaired and multi-asset content', () => {
  const { map } = vilaEFloresta()
  const expected = { itemId: map.id, kind: map.kind, formatVersion: 6 }
  expect(inspectPintaCausalDocument(assetToJson(map), { ...expected, itemId: 'other' })).toBeNull()
  expect(inspectPintaCausalDocument(assetToJson(map), { ...expected, kind: 'map-set' })).toBeNull()
  expect(
    inspectPintaCausalDocument(assetToJson(map), { ...expected, formatVersion: 99 }),
  ).toBeNull()

  type Container = { version: number; assets: Record<string, unknown>[] }
  const attempts: Array<(container: Container) => void> = [
    (doc) => {
      doc.version = 99
    },
    (doc) => {
      doc.version = 1
    },
    (doc) => {
      doc.assets[0]!.schema = 99
    },
    (doc) => {
      doc.assets[0]!.futureCollision = true
    },
    (doc) => {
      doc.assets[0]!.name = 0
    },
    (doc) => {
      doc.assets.push({ id: 'invalid-second-drawing' })
    },
  ]
  for (const change of attempts) {
    const doc = JSON.parse(assetToJson(map)) as Container
    change(doc)
    expect(inspectPintaCausalDocument(JSON.stringify(doc), expected)).toBeNull()
  }
})

test('accepts the historic missing platform field only as the documented false default', () => {
  const sheet = createTilesetAsset({ name: 'folha', tileSize: 16 })
  const old = JSON.parse(assetToJson(sheet))
  delete old.assets[0].platform
  const manifest = inspect(sheet, JSON.stringify(old), 1)?.manifest
  expect(manifest).toMatchObject({ sheet: { tileSize: 16, count: 1 }, refs: [] })
  old.assets[0].platform = [true, true]
  expect(inspect(sheet, JSON.stringify(old), 1)).toBeNull()
})
