/**
 * Bytes congelados dos formatos novos, gerados uma vez pelo código de 23/11/2026 com
 * `bun scripts/generate-format-fixtures.ts` (IDs, horários e revisão fixos; ver o cabeçalho do
 * script). Cada teste abre o arquivo pelo leitor de produção e confere o conteúdo autoral.
 * Se um teste daqui falhar, o leitor deixou de abrir arquivos já gravados: conserte o leitor,
 * não regenere a fixture.
 */
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import {
  hexRegionCellAt,
  makePintaHexCell,
  type PintaRegionCells,
  regionCellAt,
} from '@sistemazero/core/creations'
import { readPintaRegionImageData } from '@sistemazero/core/studio/pinta-region-image'
import { readPintaRegionImageWorld } from '@sistemazero/core/studio/pinta-region-image-world'
import { readPintaPngText } from '@sistemazero/core/studio/pinta-region-png-text'
import { readPintaRegionScene } from '@sistemazero/core/studio/pinta-region-scene'
import type { PintaWorkshopAsset } from '../core/assetMemory'
import {
  isObjectLayer,
  isTileLayer,
  type RegionTilemapAsset,
  sanitizeRegionTilemapAsset,
} from '../core/project'
import { isProjectedTileLayer } from '../core/projectedDocument'
import { pintaWorkshopBody } from '../core/workshopAsset'
import { LOCAL_ASSET_PREFIX } from '../state/localAssetAuthority'
import {
  localRegionStorageCodec,
  prepareLocalRegionDocument,
} from '../state/localRegionChunkStorage'
import { automapSheetIdentity } from '../tiles/automapping/book'
import { isPintaAuthoredMap } from '../tiles/automapping/model'
import { CELL_FLIP_H, makeCell } from '../tiles/cell'
import { cellAt } from '../tiles/tilemapOps'
import { inspectPintaCausalDocument } from './pintaCausalManifest'
import { readPintaWorkshopBackup } from './workshopDocument'
import { decodeWorkshopProjectedMap } from './workshopProjection'

const bytes = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url))
const text = (name: string) => gunzipSync(bytes(name)).toString('utf8')

const PLACA = {
  id: 'placa',
  name: 'Placa',
  type: 'aviso',
  x: -24.5,
  y: 8,
  width: 16,
  height: 16,
  properties: {},
}

function regionMap(asset: unknown): RegionTilemapAsset {
  const map = sanitizeRegionTilemapAsset(asset)
  if (!map) throw Error('Cenário regional ausente')
  return map
}

function expectSheet(asset: PintaWorkshopAsset | undefined) {
  if (asset?.kind !== 'tileset') throw Error('Folha ausente')
  expect(asset).toMatchObject({ id: 'folha-chao', name: 'chao', tileSize: 16 })
  expect(asset.solid).toEqual([false, true, false, false])
  expect(asset.platform).toEqual([false, false, true, false])
  expect(asset.tiles.map((tile) => [tile.width, tile.height, new Set(tile.data)])).toEqual(
    [1, 2, 3, 4].map((color) => [16, 16, new Set([color])]),
  )
}

/** O cenário 8 da fixture: origem negativa, três chunks no chão, peça espelhada e uma placa. */
function expectVila(map: RegionTilemapAsset) {
  expect(map).toMatchObject({
    id: 'cenario-vila',
    name: 'vila-congelada',
    kind: 'tilemap',
    schema: 8,
    tilesetId: 'folha-chao',
    origin: { col: -40, row: -8 },
    cols: 96,
    rows: 48,
  })
  expect(map.layers.map((layer) => [layer.id, isTileLayer(layer) ? 'peças' : layer.kind])).toEqual([
    ['chao', 'peças'],
    ['frente', 'peças'],
    ['portas', 'objects'],
  ])
  expect(
    map.layers.map((layer) =>
      isTileLayer(layer) ? layer.cells.chunks.map(({ col, row }) => [col, row]) : null,
    ),
  ).toEqual([
    [
      [-2, -1],
      [0, 0],
      [1, 0],
    ],
    [[0, 0]],
    null,
  ])
  expect(
    [
      ['chao', -40, -8],
      ['chao', 0, 0],
      ['chao', 33, 5],
      ['chao', 1, 1],
      ['frente', 1, 1],
    ].map(([layer, col, row]) => cellAt(map, String(layer), Number(col), Number(row))),
  ).toEqual([2, 1, makeCell(3, CELL_FLIP_H), -1, 0])
  expect(map.layers.find(isObjectLayer)?.objects).toEqual([PLACA])
}

test('nativo 8 congelado: a galeria reabre a folha e o cenário com origem, camadas, casas e objeto', async () => {
  const json = text('pinta-nativo-8.json.gz')
  expect(JSON.parse(json)).toMatchObject({ format: 'pinta-gallery', version: 8 })
  const { assets, warnings } = await readPintaWorkshopBackup(json)
  expect(warnings).toEqual([])
  expect(assets.map((asset) => [asset.id, asset.kind])).toEqual([
    ['folha-chao', 'tileset'],
    ['cenario-vila', 'tilemap'],
  ])
  expectSheet(assets[0])
  expectVila(regionMap(assets[1]))
})

test('nativo 9 congelado: o cenário autoral reabre com o livro de autorregras e o mapa sem livro continua comum', async () => {
  const json = text('pinta-nativo-9-livro.json.gz')
  expect(JSON.parse(json)).toMatchObject({ format: 'pinta-gallery', version: 9 })
  const { assets, warnings } = await readPintaWorkshopBackup(json)
  expect(warnings).toEqual([])
  expect(assets.map((asset) => [asset.id, asset.kind])).toEqual([
    ['folha-chao', 'tileset'],
    ['cenario-vila', 'tilemap'],
    ['mapa-casinha', 'tilemap'],
  ])
  const [sheet, authored, plain] = assets
  expectSheet(sheet)
  if (!authored || !isPintaAuthoredMap(authored)) throw Error('Cenário autoral ausente')
  expect(authored.schema).toBe(9)
  expectVila(regionMap(pintaWorkshopBody(authored)))
  if (sheet?.kind !== 'tileset') throw Error('Folha ausente')
  const { sha256 } = await automapSheetIdentity(sheet)
  const plane = (layer: string) => ({ layer, sheet: 'folha-chao', sha256, cells: [0] })
  expect(authored.automapping).toEqual({
    format: 'pinta-regras',
    version: 1,
    seed: 7,
    rules: [
      {
        id: 'grama',
        name: 'Grama',
        width: 1,
        height: 1,
        input: [plane('chao')],
        outputs: [[plane('frente')]],
      },
    ],
  })
  if (plain?.kind !== 'tilemap' || isPintaAuthoredMap(plain) || 'origin' in plain)
    throw Error('Mapa comum ausente')
  expect(plain).toMatchObject({ name: 'casinha', tilesetId: 'folha-chao', cols: 3, rows: 2 })
  expect(plain.layers.map((layer) => layer.id)).toEqual(['chao', 'frente'])
  expect(cellAt(plain, 'chao', 1, 1)).toBe(2)
  expect(cellAt(plain, 'chao', 0, 0)).toBe(-1)
})

function projectedDocument(name: string, itemId: string) {
  const json = text(name)
  const raw = JSON.parse(json)
  expect(raw).toMatchObject({
    format: 'pinta-gallery',
    version: 9,
    assets: [{ kind: 'tilemap', schema: 9, id: itemId, capability: 'projection' }],
  })
  const admitted = inspectPintaCausalDocument(json, {
    itemId,
    kind: 'tilemap',
    formatVersion: 8,
    allowWorkshop: true,
  })
  if (!admitted) throw Error('Documento projetado recusado')
  const decoded = decodeWorkshopProjectedMap(raw.assets[0])
  if (!decoded) throw Error('Corpo projetado recusado')
  expect(admitted.asset).toEqual(decoded)
  expect(admitted.manifest.refs.map((ref) => ref.id)).toEqual(['folha-chao'])
  return { map: decoded, manifest: admitted.manifest }
}

test('nativo 9 projetado com livro congelado: hexágono, transformações das casas e regras reabrem', () => {
  const { map, manifest } = projectedDocument('pinta-nativo-9-projecao-livro.json.gz', 'mapa-hex')
  expect(map).toMatchObject({
    id: 'mapa-hex',
    name: 'colmeia',
    schema: 9,
    growth: 'fixed',
    physics: 'precise',
    origin: { col: 0, row: 0 },
    cols: 5,
    rows: 2,
    projection: {
      kind: 'hexagonal',
      tileWidth: 32,
      tileHeight: 32,
      hexSideLength: 16,
      staggerAxis: 'x',
      staggerIndex: 'even',
    },
  })
  const [ground, front] = map.layers
  if (!ground || !isProjectedTileLayer(ground) || ground.cells.kind !== 'hex-regions')
    throw Error('Chão hexagonal ausente')
  expect([ground.id, front?.id]).toEqual(['chao', 'frente'])
  const turned = makePintaHexCell(0, { rotation: 120, flipX: true })
  const plain = makePintaHexCell(2)
  if (turned === null || plain === null) throw Error('Casa hexagonal inválida')
  expect(hexRegionCellAt(ground.cells, 0, 0)).toBe(turned)
  expect(hexRegionCellAt(ground.cells, 1, 1)).toBe(plain)
  expect(map.automapping?.rules.map((rule) => rule.id)).toEqual(['grama'])
  expect(manifest.refs[0]?.ruleSheetSha256).toBe(map.automapping?.rules[0]?.input[0]?.sha256)
})

test('nativo 9 projetado sem livro congelado: a praça isométrica reabre sem autorregras', () => {
  const { map } = projectedDocument('pinta-nativo-9-projecao.json.gz', 'mapa-iso')
  expect(map).toMatchObject({
    id: 'mapa-iso',
    name: 'praca',
    schema: 9,
    growth: 'expandable',
    physics: 'precise',
    projection: { kind: 'isometric', tileWidth: 32, tileHeight: 16 },
  })
  expect(map).not.toHaveProperty('automapping')
  const ground = map.layers[0]
  if (!ground || !isProjectedTileLayer(ground) || ground.cells.kind !== 'regions')
    throw Error('Chão ausente')
  expect(regionCellAt(ground.cells, 2, 1)).toBe(3)
  expect(regionCellAt(ground.cells, 0, 0)).toBe(-1)
})

test('físico 3 congelado: o registro do IndexedDB reabre pelos chunks e coincide com o nativo 8', async () => {
  const raw: { key: unknown; document: unknown; chunks: Record<string, string> } = JSON.parse(
    text('pinta-fisico-regioes-3.json.gz'),
  )
  expect(raw.key).toBe(`${LOCAL_ASSET_PREFIX}cenario-vila`)
  expect(raw.document).toMatchObject({
    version: 3,
    capability: 8,
    revision: 'revisao-congelada',
    storage: 'pinta-regions-32-v1',
  })
  const key = String(raw.key)
  const records = new Map<string, unknown>([[key, raw.document]])
  for (const [chunk, base64] of Object.entries(raw.chunks)) {
    const data = Buffer.from(base64, 'base64')
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    records.set(
      chunk,
      Int16Array.from({ length: data.byteLength / 2 }, (_, index) =>
        view.getInt16(index * 2, true),
      ),
    )
  }
  const prepared = prepareLocalRegionDocument(key, raw.document)
  expect(prepared?.revision).toBe('revisao-congelada')
  expect(prepared?.keys).toEqual([
    'pinta:local:chunk:cenario-vila:chao:-2:-1',
    'pinta:local:chunk:cenario-vila:chao:0:0',
    'pinta:local:chunk:cenario-vila:chao:1:0',
    'pinta:local:chunk:cenario-vila:frente:0:0',
  ])
  expect(localRegionStorageCodec.keys(key, raw.document)).toEqual(prepared?.keys ?? [])
  const decoded = localRegionStorageCodec.decode(key, raw.document, records)
  expect(decoded).toMatchObject({ version: 1, capability: 8, revision: 'revisao-congelada' })
  if (!decoded || typeof decoded !== 'object' || !('asset' in decoded)) throw Error('Mapa ausente')
  const map = regionMap(decoded.asset)
  expectVila(map)
  const native = await readPintaWorkshopBackup(text('pinta-nativo-8.json.gz'))
  expect(map).toEqual(regionMap(native.assets[1]))
})

function expectVilaScene(scene: ReturnType<typeof readPintaRegionScene>) {
  if (!scene) throw Error('Cena recusada')
  expect(scene).toMatchObject({
    version: 4,
    id: 'cenario-vila',
    name: 'vila-congelada',
    tileSize: 16,
    cols: 96,
    rows: 48,
    origin: { col: -40, row: -8 },
    physics: 'legacy',
  })
  expect(scene.tilesets).toMatchObject([
    { id: 'folha-chao', name: 'chao', columns: 4, count: 4, solid: [1], platform: [2] },
  ])
  expect(scene.layers.map((layer) => [layer.id, layer.kind])).toEqual([
    ['chao', 'tiles'],
    ['frente', 'tiles'],
    ['portas', 'objects'],
  ])
  const cells = new Map<string, PintaRegionCells>()
  for (const layer of scene.layers) if (layer.kind === 'tiles') cells.set(layer.id, layer.cells)
  const at = (layer: string, col: number, row: number) => {
    const grid = cells.get(layer)
    if (!grid) throw Error(`Camada ${layer} ausente`)
    return regionCellAt(grid, col, row)
  }
  expect([at('chao', -40, -8), at('chao', 0, 0), at('chao', 33, 5), at('frente', 1, 1)]).toEqual([
    2,
    1,
    makeCell(3, CELL_FLIP_H),
    0,
  ])
  const objects = scene.layers.find((layer) => layer.kind === 'objects')
  expect(objects?.kind === 'objects' ? objects.objects : null).toEqual([PLACA])
}

test('cena 4 congelada: o leitor do Core reabre camadas, folha, casas e objeto', () => {
  expectVilaScene(readPintaRegionScene(text('pinta-cena-4.json.gz')))
})

test('PNG 5 congelado: o leitor de mundo reabre a capa, a folha e a mesma cena 4', () => {
  const png = new Uint8Array(bytes('pinta-png-5.png'))
  const world = readPintaRegionImageWorld(png)
  expect(world.rootId).toBe('cenario-vila')
  const root = world.maps.get('cenario-vila')
  if (root?.data.scene.version !== 4) throw Error('Mapa raiz regional ausente')
  expect([root.width, root.height]).toEqual([32, 16])
  expect(root.data).toMatchObject({ format: 'pinta', version: 5, kind: 'map', scale: 1 })
  expect(root.data.name).toBe('vila-congelada')
  expectVilaScene(root.data.scene)
  const scene4 = readPintaRegionScene(text('pinta-cena-4.json.gz'))
  if (!scene4) throw Error('Cena 4 recusada')
  expect(root.data.scene).toEqual(scene4)
  expect([...world.images.values()].map(({ width, height }) => [width, height])).toEqual([[64, 16]])
  const embedded = readPintaPngText(png)
  expect(readPintaRegionImageData(embedded.text)).toEqual(root.data)
})
