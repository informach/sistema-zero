import { expect, test } from 'bun:test'
import { galleryToPintaJson, importPintaJson } from '../export/projectJson'
import { prepareMapRegions } from '../tiles/regionMap'
import { captureMapResourceVersion } from '../tiles/resourceVersions'
import { assetBytes, retainedAssetBytes } from './assetMemory'
import {
  createBitmap,
  createTilemapAsset,
  createTilesetAsset,
  createVectorTilesetAsset,
  sanitizePintaAsset,
  sanitizeRegionTilemapAsset,
  withPintaSchemaStamp,
} from './project'
import { PINTA_RESOURCE_LIMITS } from './projectConfig'

function largeSheet() {
  const properties = Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [`p${i}`, 'a'.repeat(200)]),
  )
  return withPintaSchemaStamp({
    ...createTilesetAsset({ name: 'terra', tileSize: 16 }),
    tiles: Array.from({ length: 256 }, () => createBitmap(16, 16)),
    solid: Array(256).fill(false),
    platform: Array(256).fill(false),
    tileProperties: Object.fromEntries(
      Array.from({ length: 256 }, (_, i) => [i, { ...properties }]),
    ),
  })
}

test('typed tile metadata contributes to retained memory in both visual styles without changing the legacy reader metric', () => {
  const properties = Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [`p${i}`, 'a'.repeat(200)]),
  )
  for (const asset of [
    createTilesetAsset({ name: 'Terra', tileSize: 16 }),
    createVectorTilesetAsset({ name: 'Terra', tileSize: 16 }),
  ]) {
    expect(
      retainedAssetBytes({ ...asset, tileProperties: { 0: properties } }) -
        retainedAssetBytes(asset),
    ).toBeGreaterThanOrEqual(JSON.stringify(properties).length * 2)
    expect(assetBytes({ ...asset, tileProperties: { 0: properties } })).toBe(assetBytes(asset))
  }
})

test('large typed metadata reaches the existing resource byte limit before the version count', () => {
  const tilemap = createTilemapAsset({ name: 'Vila', tilesetId: 'ground', cols: 2, rows: 2 })
  const sheet = largeSheet()
  expect(retainedAssetBytes(sheet)).toBeGreaterThan(JSON.stringify(sheet.tileProperties).length * 2)
  let map = tilemap,
    count = 0
  for (;;) {
    const captured = captureMapResourceVersion(map, sheet, 0)
    if (!captured.ok) {
      expect(captured.reason).toBe('memory-budget')
      break
    }
    map = captured.map
    count++
    expect(
      map.resources!.reduce((sum, r) => sum + retainedAssetBytes(r.asset), 0),
    ).toBeLessThanOrEqual(PINTA_RESOURCE_LIMITS.maxSnapshotBytes)
    if (count > PINTA_RESOURCE_LIMITS.maxVersions) throw Error('Orçamento não encerrou a captura')
  }
  expect(count).toBeGreaterThan(0)
  expect(count).toBeLessThanOrEqual(5)
})

test('legacy catalogs still open above the new metadata estimate; native 8 and new captures refuse growth atomically', () => {
  const sheet = largeSheet(),
    dense = createTilemapAsset({ name: 'vila', tilesetId: 'ground', cols: 2, rows: 2 })
  const map = {
    ...dense,
    schema: 6,
    resources: Array.from({ length: 6 }, (_, i) => ({
      sourceId: sheet.id,
      capturedAt: 0,
      asset: { ...sheet, id: `private-${i}` },
    })),
  }
  const before = structuredClone(map),
    read = sanitizePintaAsset(map)
  expect(read).toEqual(map)
  expect(importPintaJson(galleryToPintaJson([map])).assets).toEqual([map])
  expect(map.resources.reduce((sum, r) => sum + assetBytes(r.asset), 0)).toBeLessThan(
    PINTA_RESOURCE_LIMITS.maxSnapshotBytes,
  )
  expect(map.resources.reduce((sum, r) => sum + retainedAssetBytes(r.asset), 0)).toBeGreaterThan(
    PINTA_RESOURCE_LIMITS.maxSnapshotBytes,
  )
  expect(captureMapResourceVersion(map, sheet, 0)).toEqual({ ok: false, reason: 'memory-budget' })
  expect(prepareMapRegions(map)).toEqual({ ok: false, reason: 'invalid-map' })
  const regions = prepareMapRegions(dense)
  if (!regions.ok) throw Error(regions.reason)
  expect(sanitizeRegionTilemapAsset({ ...regions.map, resources: map.resources })).toBeNull()
  expect(map).toEqual(before)
})

test('retained layer properties are counted once outside shared resource payloads', () => {
  const dense = createTilemapAsset({ name: 'vila', tilesetId: 'ground', cols: 2, rows: 2 })
  const properties = { note: 'a'.repeat(200) }
  const map = { ...dense, layers: dense.layers.map((l) => ({ ...l, properties })) }
  expect(retainedAssetBytes(map, false) - assetBytes(map, false)).toBe(
    JSON.stringify(properties).length * 2,
  )
})
