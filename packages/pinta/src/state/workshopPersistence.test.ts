import { expect, test } from 'bun:test'
import { automapFixture } from '../testing/automapFixture'
import { idbMockDb } from '../testing/idbMock'
import { isPintaAuthoredMap } from '../tiles/automapping/model'
import { expandRegionMap, prepareMapRegions } from '../tiles/regionMap'
import { setCell } from '../tiles/tilemapOps'
import { LOCAL_ASSET_PREFIX } from './localAssetAuthority'
import { localDenseStorageCodec } from './localChunkStorage'
import { localRegionStorageCodec } from './localRegionChunkStorage'
import { createRegionPintaPersistence } from './localRegionPersistence'
import { createPintaPersistence } from './persistence'
import {
  captureWorkshopPintaAssetForImage,
  createWorkshopPintaPersistence,
  sanitizeWorkshopAsset,
} from './workshopPersistence'
import { createWorkshopStorageCodec } from './workshopStorageCodec'

test('leitor A guarda 9 no mesmo IndexedDB do perfil, retém o livro, e antigos não veem a autoridade como mapa vazio', async () => {
  const { sheet, map, book } = await automapFixture()
  const region = prepareMapRegions(map)
  if (!region.ok) throw Error(region.reason)
  const expanded = expandRegionMap(region.map, { col: -128, row: -64, cols: 800, rows: 500 })
  if (!expanded.ok) throw Error(expanded.reason)
  const painted = setCell(expanded.map, map.layers[0]!.id, -128, -64, 0)
  for (const base of [map, painted]) {
    const namespace = 'workshop-reader-' + ('origin' in base ? 'regional' : 'denso')
    const local = createWorkshopPintaPersistence({ namespace })
    const authored =
      'origin' in base
        ? { ...base, schema: 9 as const, automapping: book }
        : { ...base, schema: 9 as const, automapping: book }
    await local.persistAssets([sheet, authored])
    const database = idbMockDb('sistema-zero-pinta-' + namespace)
    const checkpoint = database.get(LOCAL_ASSET_PREFIX + map.id)
    const codec = createWorkshopStorageCodec(sanitizeWorkshopAsset)
    const key = LOCAL_ASSET_PREFIX + map.id
    const physical = codec.encode(key, checkpoint, new Map())
    expect(physical.document).toMatchObject({
      version: 4,
      capability: 9,
      id: map.id,
      book,
      body: { version: 'origin' in base ? 3 : 1 },
    })
    expect(physical.chunks.size).toBe('origin' in base ? 1 : 0)
    expect(codec.keys(key, physical.document)).toEqual([...physical.chunks.keys()])
    expect(codec.decode(key, physical.document, physical.chunks)).toEqual(checkpoint)
    for (const oldCodec of [localDenseStorageCodec, localRegionStorageCodec]) {
      expect(oldCodec.keys(key, physical.document)).toEqual([])
      expect(oldCodec.decode(key, physical.document, physical.chunks)).toBe(physical.document)
    }
    const reloaded = await createWorkshopPintaPersistence({ namespace }).loadAssetById(map.id)
    expect(reloaded && isPintaAuthoredMap(reloaded) && reloaded.automapping).toEqual(book)
    expect(reloaded && 'origin' in reloaded).toBe('origin' in base)
    const capture = await captureWorkshopPintaAssetForImage(map.id, { namespace })
    expect(capture.ok && capture.tilesets.map((a) => a.id)).toContain(sheet.id)
    for (const old of [
      createPintaPersistence({ namespace }),
      createRegionPintaPersistence({ namespace }),
    ]) {
      expect(await old.loadAssetById(map.id)).toBeNull()
      expect(await old.listAllAssets()).toHaveLength(1)
      expect(old.getReadIssues?.()).toContainEqual(
        expect.objectContaining({ id: map.id, version: 9 }),
      )
    }
    expect(database.get(LOCAL_ASSET_PREFIX + map.id)).toEqual(checkpoint)
    const shadow = await local.causal.encodeCandidates([authored], new AbortController().signal)
    expect(shadow.puts[0]?.formatVersion).toBe(8)
    const gzip = shadow.blobs.get(map.id)!
    const text = await new Response(
      gzip.stream().pipeThrough(new DecompressionStream('gzip')),
    ).text()
    const restored = local.causal.decodeCandidate(text)
    expect(restored && isPintaAuthoredMap(restored) && restored.automapping).toEqual(book)
  }
})
