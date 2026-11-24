/**
 * Gera as fixtures congeladas dos formatos novos em `src/export/__fixtures__/`, lidas por
 * `src/export/formatFixtures.test.ts`:
 *
 * - `pinta-nativo-8.json.gz`: galeria nativa 8 (`pinta-gallery`, versão 8) com folha e cenário 8;
 * - `pinta-nativo-9-livro.json.gz`: galeria nativa 9 com um cenário autoral (livro de
 *   autorregras) e um mapa sem livro;
 * - `pinta-nativo-9-projecao-livro.json.gz` e `pinta-nativo-9-projecao.json.gz`: documento 9 de
 *   um item com corpo projetado (`capability: 'projection'`), com e sem livro;
 * - `pinta-fisico-regioes-3.json.gz`: registro físico 3 do IndexedDB (`pinta-regions-32-v1`).
 *   O IndexedDB guarda clones estruturados; aqui o cabeçalho vai em JSON e cada chunk
 *   `Int16Array` em base64 little-endian;
 * - `pinta-cena-4.json.gz`: cena 4 emitida por `exportPintaRegionScene`;
 * - `pinta-png-5.png`: PNG com os dados Pinta 5 embutidos por `embedPintaRegionImage`.
 *
 * Determinístico: IDs, nomes, horários e revisão fixos; gzip/zlib do fflate com `mtime: 0`.
 * As imagens da folha e da capa são PNGs RGBA mínimos montados aqui (no produto vêm do canvas);
 * os leitores conferem estrutura, CRC e dimensões, não a correspondência com os pixels.
 *
 * NÃO regenere para fazer um teste passar: a fixture existe para que uma mudança no leitor que
 * deixe de abrir arquivos já gravados falhe. Rode só para acrescentar um formato novo.
 *
 *   bun scripts/generate-format-fixtures.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { makePintaHexCell, PINTA_HEX_EMPTY_CELL } from '@sistemazero/core/creations'
import { gzipSync, zlibSync } from 'fflate'
import {
  createBitmap,
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  type RegionTilemapAsset,
  type TilemapAsset,
  type TilemapObjectLayer,
  type TilesetAsset,
} from '../src/core/project'
import { isProjectedTileLayer } from '../src/core/projectedDocument'
import { pngChunk } from '../src/export/pngText'
import { pintaBackupFromEncoded } from '../src/export/projectJson'
import { embedPintaRegionImage } from '../src/export/regionImage'
import { exportPintaRegionScene } from '../src/export/regionScene'
import { attachWorkshopBook, pintaWorkshopBackup } from '../src/export/workshopDocument'
import {
  encodeWorkshopProjectedMap,
  type WorkshopProjectedMap,
} from '../src/export/workshopProjection'
import { LOCAL_ASSET_PREFIX } from '../src/state/localAssetAuthority'
import { localRegionStorageCodec } from '../src/state/localRegionChunkStorage'
import { type AutomapBook, automapSheetIdentity } from '../src/tiles/automapping/book'
import { CELL_FLIP_H, makeCell } from '../src/tiles/cell'
import { createRegionMapObject } from '../src/tiles/mapObjects'
import { expandRegionMap, prepareMapRegions } from '../src/tiles/regionMap'
import { setCell } from '../src/tiles/tilemapOps'

const NOW = 1_763_856_000_000
const OUT = new URL('../src/export/__fixtures__/', import.meta.url)

function fail(message: string): never {
  throw new Error(`Fixture: ${message}`)
}

/** PNG RGBA 8 bits sem entrelaçamento; uma cor por faixa vertical de `band` pixels. */
function solidPng(width: number, height: number, band: number, colors: number[][]): Uint8Array {
  const row = width * 4 + 1
  const raw = new Uint8Array(row * height)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      raw.set(colors[Math.floor(x / band) % colors.length]!, y * row + 1 + x * 4)
  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  header.set([8, 6, 0, 0, 0], 8)
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlibSync(raw, { level: 9 })),
    pngChunk('IEND', new Uint8Array()),
  ]
  const png = new Uint8Array(parts.reduce((size, part) => size + part.length, 0))
  let at = 0
  for (const part of parts) {
    png.set(part, at)
    at += part.length
  }
  return png
}
const dataUrl = (png: Uint8Array) => `data:image/png;base64,${Buffer.from(png).toString('base64')}`

function sheet(): TilesetAsset {
  const base = createTilesetAsset({ name: 'chao', tileSize: 16, now: NOW })
  const tiles = [1, 2, 3, 4].map((color) => {
    const bitmap = createBitmap(16, 16)
    bitmap.data.fill(color)
    return bitmap
  })
  return {
    ...base,
    id: 'folha-chao',
    tiles,
    solid: [false, true, false, false],
    platform: [false, false, true, false],
  }
}

/** Mapa denso com as camadas `chao` e `frente`, IDs fixos. */
function denseMap(id: string, name: string, sheetId: string, cols: number, rows: number) {
  const dense = createTilemapAsset({ name, tilesetId: sheetId, cols, rows, now: NOW })
  const ground = dense.layers[0]
  if (!ground || !isTileLayer(ground)) fail('camada de peças ausente')
  const map: TilemapAsset = {
    ...dense,
    id,
    layers: [
      { ...ground, id: 'chao', name: 'Chão' },
      { ...ground, id: 'frente', name: 'Frente', cells: ground.cells.slice() },
    ],
  }
  return map
}

function regional(map: TilemapAsset): RegionTilemapAsset {
  const converted = prepareMapRegions(map)
  if (!converted.ok) fail(converted.reason)
  return converted.map
}

/** Cenário 8 com origem negativa, chunks em três posições, peça espelhada e objeto fracionário. */
function vila(sheetId: string): RegionTilemapAsset {
  const expanded = expandRegionMap(
    regional(denseMap('cenario-vila', 'vila-congelada', sheetId, 4, 3)),
    { col: -40, row: -8, cols: 96, rows: 48 },
  )
  if (!expanded.ok) fail(expanded.reason)
  let map = expanded.map
  map = setCell(map, 'chao', -40, -8, 2)
  map = setCell(map, 'chao', 0, 0, 1)
  map = setCell(map, 'chao', 33, 5, makeCell(3, CELL_FLIP_H))
  map = setCell(map, 'frente', 1, 1, 0)
  const placa = createRegionMapObject({
    id: 'placa',
    name: 'Placa',
    type: 'aviso',
    x: -24.5,
    y: 8,
    width: 16,
    height: 16,
  })
  if (!placa) fail('objeto recusado')
  const portas: TilemapObjectLayer = {
    kind: 'objects',
    id: 'portas',
    name: 'Portas',
    visible: true,
    objects: [placa],
  }
  return { ...map, layers: [...map.layers, portas] }
}

async function rulebook(folha: TilesetAsset): Promise<AutomapBook> {
  const { sha256 } = await automapSheetIdentity(folha)
  const plane = (layer: string) => ({ layer, sheet: folha.id, sha256, cells: [0] })
  return {
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
  }
}

function projected(folha: TilesetAsset, book: AutomapBook) {
  const hexCells = new Uint32Array(1024).fill(PINTA_HEX_EMPTY_CELL)
  hexCells[0] = makePintaHexCell(0, { rotation: 120, flipX: true }) ?? fail('casa hexagonal')
  hexCells[33] = makePintaHexCell(2) ?? fail('casa hexagonal')
  const hexBase = regional(denseMap('mapa-hex', 'colmeia', folha.id, 5, 2))
  const hex: WorkshopProjectedMap = {
    ...hexBase,
    schema: 9,
    growth: 'fixed',
    physics: 'precise',
    projection: {
      kind: 'hexagonal',
      tileWidth: 32,
      tileHeight: 32,
      hexSideLength: 16,
      staggerAxis: 'x',
      staggerIndex: 'even',
    },
    layers: hexBase.layers.map((layer, index) =>
      isProjectedTileLayer(layer)
        ? {
            ...layer,
            cells: {
              kind: 'hex-regions',
              side: 32,
              version: 1,
              chunks: index === 0 ? [{ col: 0, row: 0, cells: hexCells }] : [],
            },
          }
        : layer,
    ),
    automapping: book,
  }
  const isoBase = setCell(regional(denseMap('mapa-iso', 'praca', folha.id, 5, 2)), 'chao', 2, 1, 3)
  const iso: WorkshopProjectedMap = {
    ...isoBase,
    schema: 9,
    growth: 'expandable',
    physics: 'precise',
    projection: { kind: 'isometric', tileWidth: 32, tileHeight: 16 },
  }
  const document = (map: WorkshopProjectedMap) =>
    pintaBackupFromEncoded([encodeWorkshopProjectedMap(map) ?? fail('projeção recusada')], 9)
  return { hex: document(hex), iso: document(iso) }
}

function physical(map: RegionTilemapAsset) {
  const key = LOCAL_ASSET_PREFIX + map.id
  const logical = { version: 1, capability: 8, revision: 'revisao-congelada', asset: map }
  const encoded = localRegionStorageCodec.encode(key, logical, new Map())
  const chunks: Record<string, string> = {}
  for (const [chunk, cells] of encoded.chunks) {
    const bytes = new Uint8Array(cells.length * 2)
    const view = new DataView(bytes.buffer)
    for (const [index, cell] of cells.entries()) view.setInt16(index * 2, cell, true)
    chunks[chunk] = Buffer.from(bytes).toString('base64')
  }
  return JSON.stringify({ key, document: encoded.document, chunks }, null, 2)
}

const gz = (text: string) => gzipSync(new TextEncoder().encode(text), { level: 9, mtime: 0 })

const folha = sheet()
const map = vila(folha.id)
const book = await rulebook(folha)
const authored = attachWorkshopBook(map, book) ?? fail('livro recusado')
const casinha = denseMap('mapa-casinha', 'casinha', folha.id, 3, 2)
const casinhaChao = casinha.layers[0]
if (!casinhaChao || !isTileLayer(casinhaChao)) fail('camada da casinha')
casinhaChao.cells[4] = 2

const native8 = (await pintaWorkshopBackup([folha, map])) ?? fail('nativo 8 recusado')
const native9 = (await pintaWorkshopBackup([folha, authored, casinha])) ?? fail('nativo 9 recusado')
const projections = projected(folha, book)
const sheetPng = dataUrl(
  solidPng(64, 16, 16, [
    [32, 160, 64, 255],
    [96, 64, 32, 255],
    [200, 200, 64, 255],
    [64, 96, 224, 255],
  ]),
)
const scene = await exportPintaRegionScene(
  map,
  (id) => (id === folha.id ? folha : null),
  async (asset) => (asset.id === folha.id ? sheetPng : null),
)
const cover = solidPng(32, 16, 16, [
  [224, 64, 32, 255],
  [32, 64, 224, 255],
])
const image = await embedPintaRegionImage(cover, scene.json)

mkdirSync(OUT, { recursive: true })
const files: Array<[string, Uint8Array]> = [
  ['pinta-nativo-8.json.gz', gz(native8)],
  ['pinta-nativo-9-livro.json.gz', gz(native9)],
  ['pinta-nativo-9-projecao-livro.json.gz', gz(projections.hex)],
  ['pinta-nativo-9-projecao.json.gz', gz(projections.iso)],
  ['pinta-fisico-regioes-3.json.gz', gz(physical(map))],
  ['pinta-cena-4.json.gz', gz(scene.json)],
  ['pinta-png-5.png', image.png],
]
for (const [name, bytes] of files) {
  writeFileSync(new URL(name, OUT), bytes)
  console.log(`${name}: ${bytes.length} bytes`)
}
