import { expect, test } from 'bun:test'
import {
  makePintaHexCell,
  PINTA_HEX_EMPTY_CELL,
  PINTA_REGION_CELL_COUNT,
} from '@sistemazero/core/creations'
import { vilaEFloresta } from '../../scripts/homologacao/fixture'
import { prepareMapRegions } from '../tiles/regionMap'
import {
  createTilemapAsset,
  isTileLayer,
  sanitizePintaAsset,
  sanitizeRegionTilemapAsset,
} from './project'
import {
  decodeProjectedTilemapDocument,
  encodeProjectedTilemapDocument,
  isProjectedTileLayer,
  type ProjectedTilemapAsset,
} from './projectedDocument'

test('real Vila authoring metadata survives private projected save and reopen with its integer square flags', () => {
  const source = prepareMapRegions(vilaEFloresta().map)
  if (!source.ok) throw Error(source.reason)
  const map: ProjectedTilemapAsset = {
    ...source.map,
    schema: 9,
    projection: { kind: 'isometric', tileWidth: 32, tileHeight: 16 },
    growth: 'expandable',
    physics: 'precise',
  }
  const wire = encodeProjectedTilemapDocument(map)!
  expect(wire.layers.filter(isProjectedTileLayer)[0]?.cells.encoding).toBe('i16le-base64-v1')
  const decoded = decodeProjectedTilemapDocument(JSON.parse(JSON.stringify(wire)))
  expect(decoded).toEqual(map)
  expect(sanitizePintaAsset(wire)).toBeNull()
  expect(sanitizeRegionTilemapAsset(wire)).toBeNull()
})

function hexMap(): ProjectedTilemapAsset {
  const ready = prepareMapRegions(
    createTilemapAsset({
      name: 'Ilha',
      cols: 4,
      rows: 4,
      tilesetId: 'tiles',
    }),
  )
  if (!ready.ok) throw Error(ready.reason)
  const cells = new Uint32Array(PINTA_REGION_CELL_COUNT).fill(PINTA_HEX_EMPTY_CELL)
  cells[1023] = makePintaHexCell(1, { rotation: 60, flipY: true })!
  return {
    ...ready.map,
    schema: 9,
    growth: 'fixed',
    projection: {
      kind: 'hexagonal',
      tileWidth: 32,
      tileHeight: 32,
      hexSideLength: 16,
      staggerAxis: 'x',
      staggerIndex: 'even',
    },
    physics: 'precise',
    origin: { col: -1, row: -1 },
    layers: ready.map.layers.map((layer) =>
      isTileLayer(layer)
        ? {
            ...layer,
            cells: {
              kind: 'hex-regions',
              side: 32,
              version: 1,
              chunks: [{ col: -1, row: -1, cells }],
            },
          }
        : layer,
    ),
  }
}

test('hex authoring writes little-endian uint32 and refuses an old reader or another orientation', () => {
  const original = hexMap()
  const wire = encodeProjectedTilemapDocument(original)!
  const layer = wire.layers.filter(isProjectedTileLayer)[0]!
  expect(layer.cells.kind).toBe('hex-regions')
  expect(Buffer.from(layer.cells.chunks[0]!.data, 'base64').readUInt32LE(1023 * 4)).toBe(0x60000001)
  expect(decodeProjectedTilemapDocument(JSON.parse(JSON.stringify(wire)))).toEqual(original)
  expect(
    decodeProjectedTilemapDocument({
      ...wire,
      projection: { kind: 'isometric', tileWidth: 32, tileHeight: 16 },
    }),
  ).toBeNull()
  const { projection, growth, ...body } = wire
  expect(sanitizeRegionTilemapAsset({ ...body, schema: 8 })).toBeNull()
})

test('authoring admission refuses unknown metadata, invalid tile references and implicit physical behavior', () => {
  const asset = hexMap()
  const wire = encodeProjectedTilemapDocument(asset)!
  expect(decodeProjectedTilemapDocument({ ...wire, ignored: true })).toBeNull()
  expect(decodeProjectedTilemapDocument({ ...wire, physics: undefined })).toBeNull()
  expect(
    decodeProjectedTilemapDocument({
      ...wire,
      layers: [{ ...wire.layers[0]!, unknownMeaning: 'keep' }],
    }),
  ).toBeNull()
  const layer = asset.layers.filter(isProjectedTileLayer)[0]!
  layer.cells.chunks[0]!.cells[1023] = makePintaHexCell(256)!
  expect(encodeProjectedTilemapDocument(asset)).toBeNull()
})
