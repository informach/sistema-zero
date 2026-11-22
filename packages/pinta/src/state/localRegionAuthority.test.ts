import { expect, test } from 'bun:test'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { recordPintaLocalOrigin } from '../core/localAssetOrigin'
import {
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  type RegionTilemapAsset,
} from '../core/project'
import { RegionBackupSizeCache } from '../export/regionBackupSize'
import { expandRegionMap, prepareMapRegions } from '../tiles/regionMap'
import { cellAt, setCell } from '../tiles/tilemapOps'
import { LOCAL_ASSET_PREFIX, resolveLocalRecords } from './localAssetAuthority'
import { createLocalRegionAssetAuthority } from './localRegionAssetAuthority'

const key = (id: string) => LOCAL_ASSET_PREFIX + id
const mirror = (id: string) => `pinta:asset:${id}`
function map(): RegionTilemapAsset {
  const source = createTilemapAsset({ name: 'vila', tilesetId: 'ground', cols: 2, rows: 2 })
  source.layers[0]!.cells![0] = 3
  const converted = prepareMapRegions(source)
  if (!converted.ok) throw Error(converted.reason)
  const expanded = expandRegionMap(converted.map, { col: -64, row: -64, cols: 10000, rows: 10000 })
  if (!expanded.ok) throw Error(expanded.reason)
  return setCell(expanded.map, expanded.map.layers[0]!.id, -64, -64, 7)
}

test('the same authority reads native 8 without losing bounds, IDs, chunks or its required capability', () => {
  const authority = createLocalRegionAssetAuthority(),
    source = map(),
    records = new Map<string, unknown>()
  const written = authority.writeLocalRecords(records, [source], new Map(), 'regional')
  expect(written.assets.get(source.id)).toEqual(source)
  expect(records.get(key(source.id))).toMatchObject({ version: 1, capability: 8, asset: source })
  expect(authority.resolveLocalRecords(records).assets.get(source.id)).toEqual(source)
  expect(resolveLocalRecords(new Map(records)).issues.map((issue) => issue.id)).toEqual([source.id])
})

test('native 8 validation keeps the RAM origin; a later listing cannot legitimize a stale edit', () => {
  const authority = createLocalRegionAssetAuthority(),
    source = map(),
    records = new Map<string, unknown>()
  const initial = authority.writeLocalRecords(records, [source], new Map(), 'regional')
  const firstRevision = initial.documents.get(source.id)!.revision
  recordPintaLocalOrigin(source, 'regional', firstRevision)
  const observed = new Map([[source.id, firstRevision]])
  const newer = authority.writeLocalRecords(
    records,
    [{ ...structuredClone(source), name: 'outra-aba' }],
    observed,
    'regional',
  )
  observed.set(source.id, newer.documents.get(source.id)!.revision)
  const saved = authority.writeLocalRecords(
    records,
    [setCell(source, source.layers[0]!.id, -64, -64, 9)],
    observed,
    'regional',
  )
  const recovered = saved.forks.get(source.id)
  expect(recovered?.id).not.toBe(source.id)
  expect(saved.assets.get(source.id)?.name).toBe('outra-aba')
  if (recovered?.kind !== 'tilemap' || !('origin' in recovered))
    throw Error('Cópia regional ausente')
  expect(recovered.schema).toBe(8)
  expect(cellAt(recovered, recovered.layers[0]!.id, -64, -64)).toBe(9)
})

test('legacy mirror divergence preserves the expanded scene and recovers the old native map independently', () => {
  const authority = createLocalRegionAssetAuthority(),
    source = map(),
    records = new Map<string, unknown>()
  authority.writeLocalRecords(records, [source], new Map(), 'regional')
  const old = createTilemapAsset({ name: 'edicao-antiga', tilesetId: 'ground', cols: 2, rows: 2 })
  records.set(mirror(source.id), { ...old, id: source.id })
  const result = authority.resolveLocalRecords(records)
  expect(result.assets.get(source.id)).toEqual(source)
  expect(records.get(mirror(source.id))).toMatchObject({
    kind: 'pinta-local-mirror',
    capability: 8,
    id: source.id,
  })
  expect(result.recovered).toHaveLength(1)
  expect(result.recovered[0]?.name).toBe('edicao-antiga-copia')
  expect(result.recovered[0]?.id).not.toBe(source.id)
})

test('a mixed tileset/map CAS conflict clones the whole graph and preserves the region representation', () => {
  const authority = createLocalRegionAssetAuthority(),
    sheet = createTilesetAsset({ name: 'ground', tileSize: 16 }),
    records = new Map<string, unknown>()
  const source = { ...map(), tilesetId: sheet.id }
  const first = authority.writeLocalRecords(records, [sheet, source], new Map(), 'regional')
  const observed = new Map([...first.documents].map(([id, doc]) => [id, doc.revision]))
  authority.writeLocalRecords(records, [{ ...source, name: 'nova-revisao' }], observed, 'regional')
  const result = authority.writeLocalRecords(
    records,
    [{ ...sheet, name: 'minhas-pecas' }, source],
    observed,
    'regional',
  )
  const copy = result.forks.get(source.id),
    tiles = result.forks.get(sheet.id)
  if (copy?.kind !== 'tilemap' || !('origin' in copy)) throw Error('Mapa ausente')
  if (!tiles) throw Error('Peças recuperadas ausentes')
  expect(copy.tilesetId).toBe(tiles.id)
  expect(copy.origin).toEqual(source.origin)
  expect(result.assets.get(sheet.id)?.name).toBe('ground')
  expect(result.assets.get(source.id)?.name).toBe('nova-revisao')
})

test('a future native map remains opaque and revokes changes to a known regional consumer', () => {
  const authority = createLocalRegionAssetAuthority(),
    source = map(),
    records = new Map<string, unknown>()
  const first = authority.writeLocalRecords(records, [source], new Map(), 'regional')
  const opaque = {
    version: 1,
    capability: 9,
    revision: 'future',
    asset: { id: 'future-map', kind: 'tilemap', schema: 9, data: ['intacto'] },
  }
  records.set(key('future-map'), opaque)
  const result = authority.writeLocalRecords(
    records,
    [{ ...source, name: 'continuada' }],
    new Map([[source.id, first.documents.get(source.id)!.revision]]),
    'regional',
  )
  expect(result.forks.size).toBe(1)
  expect(records.get(key('future-map'))).toEqual(opaque)
  expect(result.assets.get(source.id)?.name).toBe('vila')
})

test('lossy regional candidates refuse before touching records or losing the causal RAM origin', () => {
  const authority = createLocalRegionAssetAuthority(),
    source = map(),
    records = new Map<string, unknown>()
  authority.writeLocalRecords(records, [source], new Map(), 'regional')
  const before = structuredClone(records)
  const invalid = { ...source, future: true }
  expect(() => authority.writeLocalRecords(records, [invalid], new Map(), 'regional')).toThrow(
    'cenário completo',
  )
  expect(records).toEqual(before)
})

test('compact mirrors contain no cells, require their own authority revision and cannot hide an orphan', () => {
  const authority = createLocalRegionAssetAuthority(),
    source = map(),
    records = new Map<string, unknown>()
  const result = authority.writeLocalRecords(records, [source], new Map(), 'regional')
  expect(records.get(mirror(source.id))).toEqual({
    kind: 'pinta-local-mirror',
    version: 1,
    capability: 8,
    id: source.id,
    revision: result.documents.get(source.id)!.revision,
  })
  const stale = new Map(records)
  stale.set(mirror(source.id), {
    kind: 'pinta-local-mirror',
    version: 1,
    capability: 8,
    id: source.id,
    revision: 'outra',
  })
  const before = structuredClone(stale)
  expect(() => authority.resolveLocalRecords(stale)).toThrow('referência')
  expect(stale).toEqual(before)
  const orphan = new Map(records)
  orphan.delete(key(source.id))
  expect(() => authority.resolveLocalRecords(orphan)).toThrow('referência')
})

test('regional tombstones preserve late RAM as a complete fork and allow intentional restore after deletion', () => {
  const authority = createLocalRegionAssetAuthority(),
    source = map(),
    records = new Map<string, unknown>()
  const initial = authority.writeLocalRecords(records, [source], new Map(), 'regional')
  const observed = new Map([[source.id, initial.documents.get(source.id)!.revision]])
  recordPintaLocalOrigin(source, 'regional', observed.get(source.id)!)
  const deleted = authority.deleteLocalRecord(records, source.id, observed, 'regional')
  expect(records.has(mirror(source.id))).toBe(false)
  const late = authority.writeLocalRecords(records, [source], observed, 'regional')
  expect(late.assets.has(source.id)).toBe(false)
  expect(late.forks.get(source.id)).toMatchObject({ schema: 8, origin: source.origin })
  const restored = authority.writeLocalRecords(
    records,
    [structuredClone(source)],
    new Map([[source.id, deleted.documents.get(source.id)!.revision]]),
    'regional',
  )
  expect(restored.forks.size).toBe(0)
  expect(restored.assets.get(source.id)).toEqual(structuredClone(source))
})

test('gallery quota measures all maps, rejects an excessive copy and still permits deleting unchanged data to free space', () => {
  const dense = createTilemapAsset({ name: 'full', tilesetId: 'ground', cols: 256, rows: 256 })
  const layer = dense.layers[0]!
  if (!isTileLayer(layer)) throw Error('Camada ausente')
  dense.layers = Array.from({ length: 32 }, (_, index) => ({
    ...layer,
    id: `layer-${index}`,
    cells: new Int16Array(65536).fill(0),
  }))
  const converted = prepareMapRegions(dense)
  if (!converted.ok) throw Error(converted.reason)
  const maps: PintaMemoryAsset[] = Array.from({ length: 7 }, (_, index) => ({
    ...converted.map,
    id: `map-${index}`,
    name: `map-${index}`,
  }))
  const authority = createLocalRegionAssetAuthority()
  const sizes = new RegionBackupSizeCache()
  expect(sizes.byteLength(maps.slice(0, 5))).toBeLessThan(32 * 1024 * 1024)
  expect(sizes.byteLength(maps.slice(0, 6))).toBe(Infinity)
  expect(() => authority.checkLocalBudget([], maps.slice(0, 5))).not.toThrow()
  expect(() => authority.checkLocalBudget(maps.slice(0, 5), maps.slice(0, 6))).toThrow('32 MiB')
  // Both sides are above the capped file budget; unchanged strict deletion must remain possible.
  expect(() => authority.checkLocalBudget(maps, maps.slice(0, 6))).not.toThrow()
  expect(() =>
    authority.checkLocalBudget(maps, [...maps.slice(0, 5), { ...maps[5]!, name: 'different' }]),
  ).toThrow('32 MiB')
}, 10000)

test('persistence quota does not trust immutable-editor cache identities across mutable caller revisions', () => {
  const source = map(),
    authority = createLocalRegionAssetAuthority()
  const maps = Array.from({ length: 6 }, (_, index) => ({
    ...source,
    id: `mutable-${index}`,
    name: `mutable-${index}`,
  }))
  expect(() => authority.checkLocalBudget([], maps)).not.toThrow()
  const layer = source.layers[0]!
  if (!isTileLayer(layer)) throw Error('Camada ausente')
  // Still canonical, within 2048 chunks/map, but changed through an external mutable caller.
  layer.cells.chunks = Array.from({ length: 2048 }, (_, index) => ({
    col: (index % 64) - 2,
    row: Math.floor(index / 64) - 2,
    cells: new Int16Array(1024).fill(0),
  }))
  expect(new RegionBackupSizeCache().byteLength(maps)).toBe(Infinity)
  expect(() => authority.checkLocalBudget([], maps)).toThrow('32 MiB')
})
