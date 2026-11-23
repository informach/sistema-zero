/**
 * Contrato ponta a ponta do nativo 9 na persistência da oficina, para as três variantes (livro,
 * projeção hexagonal com livro, projeção isométrica sem livro): exportador real → persistência da
 * oficina → bytes físicos do IndexedDB → reabrir → reexportar igual → backup → pull causal.
 */
import { beforeEach, expect, test } from 'bun:test'
import '../testing/idbMock'
import type { PintaWorkshopAsset } from '../core/assetMemory'
import { isWorkshopProjectedMap } from '../core/workshopAsset'
import { inspectPintaCausalDocument } from '../export/pintaCausalManifest'
import {
  pintaWorkshopAssetToJson,
  pintaWorkshopBackup,
  readPintaWorkshopBackup,
} from '../export/workshopDocument'
import { clearIdbMock, idbMockDb } from '../testing/idbMock'
import {
  nativeNineGallery as gallery,
  withoutSession as plain,
} from '../testing/nativeNineFixtures'
import { isPintaAuthoredMap } from '../tiles/automapping/model'
import { prepareMapRegions } from '../tiles/regionMap'
import { authorityKey, LOCAL_ASSET_PREFIX, mirrorKey } from './localAssetAuthority'
import { LOCAL_CHUNK_PREFIX } from './localChunkStorage'
import { isLocalRegionAsset } from './localRegionAssetAuthority'
import { createRegionPintaPersistence } from './localRegionPersistence'
import { createPintaPersistence, dbNameFor, setPintaStorageNamespace } from './persistence'
import {
  captureWorkshopPintaAssetForImage,
  createWorkshopPintaPersistence,
  sanitizeWorkshopAsset,
  workshopNativeSchema,
} from './workshopPersistence'
import { createWorkshopStorageCodec } from './workshopStorageCodec'

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

const codec = createWorkshopStorageCodec(sanitizeWorkshopAsset)

/**
 * O mock do IndexedDB guarda os registros lógicos (ignora o codec da fronteira). Aqui cada
 * documento passa pelo codec da oficina como na primeira gravação real (`planLocalStorageWrites`)
 * e volta como a transação real o decodifica antes de planejar. O disco fica com o que o
 * decodificador devolveu, para a reabertura depender só desses bytes.
 */
function throughPhysicalStore(db: Map<IDBValidKey, unknown>) {
  const physical = new Map<string, unknown>()
  for (const [key, value] of db) {
    if (typeof key !== 'string') continue
    if (!key.startsWith(LOCAL_ASSET_PREFIX)) {
      physical.set(key, value)
      continue
    }
    const encoded = codec.encode(key, value, new Map())
    physical.set(key, encoded.document)
    for (const [chunk, cells] of encoded.chunks) physical.set(chunk, cells)
  }
  const logical = new Map(db)
  db.clear()
  for (const [key, value] of physical) {
    if (key.startsWith(LOCAL_CHUNK_PREFIX)) continue
    const decoded = key.startsWith(LOCAL_ASSET_PREFIX) ? codec.decode(key, value, physical) : value
    expect(structuredClone(decoded)).toEqual(structuredClone(logical.get(key)))
    db.set(key, decoded)
  }
  return physical
}

test('as três variantes fecham no IndexedDB da oficina, reabrem e reexportam os mesmos bytes', async () => {
  const namespace = 'oficina-nativo-9'
  setPintaStorageNamespace(namespace)
  const { sheet, variants } = await gallery()
  for (const { asset } of variants) {
    expect(workshopNativeSchema(asset)).toBe(9)
    expect(sanitizeWorkshopAsset(asset)).toEqual(asset)
  }
  const local = createWorkshopPintaPersistence({ namespace })
  await local.persistAssets([sheet, ...variants.map(({ asset }) => asset)])
  const db = idbMockDb(dbNameFor(namespace))
  const physical = throughPhysicalStore(db)
  for (const { asset } of variants) {
    const revision = (db.get(authorityKey(asset.id)) as { revision: string }).revision
    expect(db.get(mirrorKey(asset.id))).toEqual({
      kind: 'pinta-local-mirror',
      version: 1,
      capability: 9,
      id: asset.id,
      revision,
    })
    // The rulebook keeps its physical 4; a projected map is stored whole, as its logical record.
    expect(physical.get(authorityKey(asset.id))).toMatchObject(
      'projection' in asset
        ? { version: 1, capability: 9, revision, asset: { projection: asset.projection } }
        : { version: 4, storage: 'pinta-authored-map-v1', capability: 9, revision },
    )
  }

  const reopened = createWorkshopPintaPersistence({ namespace })
  for (const { asset, text } of variants) {
    const again = await reopened.loadAssetById(asset.id)
    expect(plain(again)).toEqual(plain(asset))
    if (!again) throw Error('Mapa nativo 9 não reabriu')
    expect(pintaWorkshopAssetToJson(again)).toBe(text)
    const shadow = await reopened.causal.encodeCandidates([again], new AbortController().signal)
    expect(shadow.puts[0]?.formatVersion).toBe(8)
    const gzip = shadow.blobs.get(asset.id)
    if (!gzip) throw Error('Sombra causal ausente')
    const json = await new Response(
      gzip.stream().pipeThrough(new DecompressionStream('gzip')),
    ).text()
    expect(json).toBe(text)
    expect(plain(reopened.causal.decodeCandidate(json))).toEqual(plain(asset))
  }
  const all = await reopened.listAllAssets()
  expect(all.map(({ id }) => id).sort()).toEqual(
    [sheet, ...variants.map(({ asset }) => asset)].map(({ id }) => id).sort(),
  )
  const backup = await pintaWorkshopBackup(all)
  if (!backup) throw Error('Backup da galeria recusado')
  const restored = await readPintaWorkshopBackup(backup)
  expect(restored.warnings).toEqual([])
  expect(plain(restored.assets)).toEqual(plain(all))

  // Older readers see a newer format, never an empty or regional map, and keep the bytes.
  for (const old of [
    createPintaPersistence({ namespace }),
    createRegionPintaPersistence({ namespace }),
  ]) {
    for (const { asset } of variants) expect(await old.loadAssetById(asset.id)).toBeNull()
    expect(old.getReadIssues?.()).toEqual(
      expect.arrayContaining(
        variants.map(({ asset }) => expect.objectContaining({ id: asset.id, version: 9 })),
      ),
    )
  }
  for (const { asset } of variants)
    expect(structuredClone(db.get(authorityKey(asset.id)))).toMatchObject({ capability: 9 })
})

test('o pull pelo manifesto causal instala as três variantes e elas reexportam iguais', async () => {
  const namespace = 'oficina-pull-nativo-9'
  setPintaStorageNamespace(namespace)
  const { sheet, variants } = await gallery()
  const local = createWorkshopPintaPersistence({ namespace, guardCausalWrites: true })
  const transitions = [{ asset: sheet, text: pintaWorkshopAssetToJson(sheet)! }, ...variants].map(
    ({ asset, text }, index) => {
      const manifest = inspectPintaCausalDocument(text, {
        itemId: asset.id,
        kind: asset.kind,
        formatVersion: 8,
        allowWorkshop: true,
      })
      expect(plain(manifest?.asset)).toEqual(plain(asset))
      const after: PintaWorkshopAsset | null = local.causal.decodeCandidate(text)
      expect(plain(after)).toEqual(plain(asset))
      return {
        id: asset.id,
        before: null,
        beforeRevision: null,
        after,
        remote: { revision: 1, layoutRevision: String(index + 1), sha256: 'a'.repeat(64) },
      }
    },
  )
  const pull = { fromEpoch: null, epoch: '1', transitions }
  const impact = await local.causal.pullImpact(pull)
  expect(await local.causal.applyPull({ ...pull, coveredIds: impact.ids }, () => true)).toBe(true)
  const reopened = createWorkshopPintaPersistence({ namespace, guardCausalWrites: true })
  for (const { asset, text } of variants) {
    const installed = await reopened.loadAssetById(asset.id)
    expect(plain(installed)).toEqual(plain(asset))
    expect(installed && pintaWorkshopAssetToJson(installed)).toBe(text)
  }
  const book = await reopened.loadAssetById(variants[0]!.asset.id)
  expect(book && !isWorkshopProjectedMap(book) && isPintaAuthoredMap(book)).toBe(true)
})

test('a recuperação copia o projetado divergente inteiro e religa o livro às camadas da cópia', async () => {
  const namespace = 'oficina-recupera-projetado'
  setPintaStorageNamespace(namespace)
  const { sheet, hex } = await gallery()
  const local = createWorkshopPintaPersistence({ namespace, guardCausalWrites: true })
  await local.persistAssets([sheet, hex])
  const captured = await local.causal.capture([sheet.id, hex.id])
  const remote = { revision: 1, layoutRevision: '1', sha256: 'c'.repeat(64) }
  const transitions = captured.map((base) => ({
    ...base,
    after: base.id === hex.id ? { ...hex, name: 'colmeia-da-conta' } : sheet,
    remote,
  }))
  const pull = { fromEpoch: null, epoch: '1', recoverInitial: true as const, transitions }
  const impact = await local.causal.pullImpact(pull)
  expect(impact.blocked).toBe(false)
  // The recovery closure takes the copy's sheet along, as for any map (checked below).
  expect(impact.ids.slice().sort()).toEqual([hex.id, sheet.id].sort())
  expect(await local.causal.applyPull({ ...pull, coveredIds: impact.ids }, () => true)).toBe(true)
  const all = await createWorkshopPintaPersistence({ namespace }).listAllAssets()
  expect(all.find(({ id }) => id === hex.id)?.name).toBe('colmeia-da-conta')
  const copy = all.find((asset) => asset.id !== hex.id && asset.name.startsWith('colmeia-copia'))
  if (!copy || !isWorkshopProjectedMap(copy) || !copy.automapping) throw Error('Cópia ausente')
  // The sheet travels in the same recovery closure; the copy points to the copied sheet.
  const copiedSheet = all.find(({ id }) => id === copy.tilesetId)
  expect(copiedSheet?.kind).toBe('tileset')
  expect(copiedSheet?.id).not.toBe(sheet.id)
  // The copy keeps every cell and its projection; the book follows the copy's layers and sheet.
  const { id: _id, name: _name, layers: copyLayers, automapping: copyBook, ...copyRest } = copy
  const { id: _hexId, name: _hexName, layers: hexLayers, automapping: hexBook, ...hexRest } = hex
  expect(plain({ ...copyRest, tilesetId: '', createdAt: 0, updatedAt: 0 })).toEqual(
    plain({ ...hexRest, tilesetId: '', createdAt: 0, updatedAt: 0 }),
  )
  expect(copyLayers.map(({ id: _layer, ...layer }) => plain(layer))).toEqual(
    hexLayers.map(({ id: _layer, ...layer }) => plain(layer)),
  )
  const copyLayerIds = new Set(copyLayers.map(({ id }) => id))
  for (const rule of copyBook.rules)
    for (const plane of [...rule.input, ...rule.outputs.flat()]) {
      expect(copyLayerIds.has(plane.layer)).toBe(true)
      expect(plane.sheet).toBe(copy.tilesetId)
    }
  expect(copyBook.rules.map(({ id }) => id)).toEqual(hexBook!.rules.map(({ id }) => id))
  expect(pintaWorkshopAssetToJson(copy)).not.toBeNull()
})

test('a captura devolve as três variantes; no guarda do editor focal só passa quem tem região física', async () => {
  const namespace = 'oficina-captura'
  setPintaStorageNamespace(namespace)
  const { sheet, plain: dense, variants } = await gallery()
  if (dense.kind !== 'tilemap' || 'origin' in dense) throw Error('Mapa denso ausente')
  const prepared = prepareMapRegions(dense)
  if (!prepared.ok) throw Error(prepared.reason)
  const region = prepared.map
  const local = createWorkshopPintaPersistence({ namespace })
  await local.persistAssets([sheet, region, ...variants.map(({ asset }) => asset)])
  const focal = await captureWorkshopPintaAssetForImage(region.id, { namespace })
  if (!focal.ok) throw Error(focal.reason)
  expect(focal.source.kind === 'tilemap' && isLocalRegionAsset(focal.source)).toBe(true)
  expect(plain(focal.source)).toEqual(plain(region))
  for (const { asset, text } of variants) {
    const capture = await captureWorkshopPintaAssetForImage(asset.id, { namespace })
    if (!capture.ok) throw Error(capture.reason)
    expect(pintaWorkshopAssetToJson(capture.source)).toBe(text)
    expect(capture.tilesets.map(({ id }) => id)).toEqual([sheet.id])
    // Every variant has `origin`; the projected one is the only one that is not a region.
    expect('origin' in capture.source).toBe(true)
    expect(isLocalRegionAsset(capture.source)).toBe(!isWorkshopProjectedMap(capture.source))
  }
})
