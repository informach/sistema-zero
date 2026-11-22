import { expect, test } from 'bun:test'
import { makePintaHexCell, PINTA_HEX_EMPTY_CELL } from '../creations/pinta-hex-cell'
import {
  encodePintaHexRegionLayers,
  encodePintaRegionLayers,
  PINTA_HEX_REGION_CHUNK_BYTES,
  PINTA_REGION_CELL_COUNT,
  PINTA_REGION_CHUNK_BYTES,
} from '../creations/pinta-regions'
import {
  type PintaProjectedSceneWire,
  preparePintaProjectedScene,
  readPintaProjectedScene,
} from './pinta-projected-scene'
import { readPintaRegionScene } from './pinta-region-scene'
import { readPintaScene } from './pinta-scene'

function scene(): PintaProjectedSceneWire {
  const bounds = { col: -32, row: -32, cols: 40, rows: 40 }
  const body = { id: 'set', origin: { col: -32, row: -32 }, cols: 40, rows: 40 }
  const solid = { name: 'Peças', kind: 'tiles', visible: true, tilesetId: 'tiles' } as const
  const iso = new Int16Array(PINTA_REGION_CELL_COUNT).fill(-1)
  iso[0] = 0x4001
  const hex = new Uint32Array(PINTA_REGION_CELL_COUNT).fill(PINTA_HEX_EMPTY_CELL)
  hex[0] = makePintaHexCell(1, { rotation: 120, flipX: true })!
  const squareGrid = {
    kind: 'regions',
    version: 1,
    side: 32,
    chunks: [{ col: -1, row: -1, cells: iso }],
  } as const
  const hexGrid = {
    kind: 'hex-regions',
    version: 1,
    side: 32,
    chunks: [{ col: -1, row: -1, cells: hex }],
  } as const
  return {
    ...body,
    id: 'root',
    name: 'Ilha',
    version: 5,
    tileSize: 32,
    physics: 'precise',
    projection: { kind: 'isometric', tileWidth: 32, tileHeight: 16 },
    tilesets: [
      {
        id: 'tiles',
        name: 'Peças',
        count: 2,
        columns: 2,
        image: 'tiles.png',
        solid: [1],
        platform: [],
      },
    ],
    layers: [
      {
        ...solid,
        id: 'iso',
        cells: encodePintaRegionLayers(
          [{ ...squareGrid, chunks: [...squareGrid.chunks] }],
          bounds,
        )![0]!,
      },
      {
        kind: 'objects',
        id: 'people',
        name: 'Lugares',
        visible: true,
        objects: [
          {
            id: 'instance',
            shape: 'set',
            setId: 'set',
            type: '',
            name: 'Ilha hexagonal',
            x: -32.5,
            y: -16.125,
            width: 64,
            height: 32,
            properties: { active: false },
          },
        ],
      },
    ],
    sets: [
      {
        ...body,
        projection: {
          kind: 'hexagonal',
          tileWidth: 32,
          tileHeight: 32,
          hexSideLength: 16,
          staggerAxis: 'y',
          staggerIndex: 'odd',
        },
        layers: [
          {
            ...solid,
            id: 'hex',
            cells: encodePintaHexRegionLayers(
              [{ ...hexGrid, chunks: [...hexGrid.chunks] }],
              bounds,
            )![0]!,
          },
        ],
      },
    ],
  }
}

test('a projected scene captures both dialects and preserves set geometry and authored object units', () => {
  const wire = scene()
  const text = JSON.stringify(wire)
  const plan = preparePintaProjectedScene(text)!
  expect(plan.indexBytes).toBe(PINTA_REGION_CHUNK_BYTES + PINTA_HEX_REGION_CHUNK_BYTES)
  const decoded = plan.decode()!
  expect(decoded.projection).toEqual(wire.projection)
  expect(readPintaProjectedScene(text)?.id).toBe(wire.id)
  const objects = decoded.layers[1]
  const wireObjects = wire.layers[1]
  if (objects?.kind !== 'objects' || wireObjects?.kind !== 'objects')
    throw Error('Camada de objetos ausente')
  expect(objects).toEqual(wireObjects)
  const square = decoded.layers[0]!
  const hex = decoded.sets![0]!.layers[0]!
  if (square.kind !== 'tiles' || hex.kind !== 'tiles') throw Error('Camadas esperadas ausentes')
  expect(square.cells.chunks[0]!.cells).toBeInstanceOf(Int16Array)
  expect(square.cells.chunks[0]!.cells[0]).toBe(0x4001)
  expect(hex.cells.chunks[0]!.cells).toBeInstanceOf(Uint32Array)
  expect(hex.cells.chunks[0]!.cells[0]).toBe(0x90000001)
  expect(plan.decode()).toBeNull()
  expect(readPintaRegionScene(text)).toBeNull()
  expect(readPintaScene(text)).toBeNull()
})

test('the last set header, physics, resources and combined index ceiling are admitted before any decode', () => {
  const wire = scene()
  const text = JSON.stringify(wire)
  expect(preparePintaProjectedScene(text, 6144)).not.toBeNull()
  expect(preparePintaProjectedScene(text, 6143)).toBeNull()
  expect(preparePintaProjectedScene(JSON.stringify({ ...wire, physics: 'legacy' }))).toBeNull()
  const base = wire.layers[0]!
  const set = wire.sets![0]!.layers[0]!
  if (base.kind !== 'tiles' || set.kind !== 'tiles') throw Error('Camadas esperadas ausentes')
  base.cells.chunks[0]!.data = 'bad base64'
  const badPayload = preparePintaProjectedScene(JSON.stringify(wire))!
  expect(badPayload.indexBytes).toBe(6144)
  expect(badPayload.decode()).toBeNull()
  const goodSet = set.cells
  set.cells = base.cells
  expect(preparePintaProjectedScene(JSON.stringify(wire))).toBeNull()
  set.cells = goodSet
  set.tilesetId = 'missing'
  expect(preparePintaProjectedScene(JSON.stringify(wire))).toBeNull()
})

test('a well-formed 32-bit chunk with a nonexistent tile refuses the entire scene', () => {
  const wire = scene()
  wire.tilesets[0]!.count = 1
  wire.tilesets[0]!.solid = []
  const square = wire.layers[0]!
  if (square.kind !== 'tiles') throw Error('Camada esperada ausente')
  const cells = new Int16Array(PINTA_REGION_CELL_COUNT).fill(-1)
  cells[0] = 0
  square.cells = encodePintaRegionLayers(
    [{ kind: 'regions', version: 1, side: 32, chunks: [{ col: -1, row: -1, cells }] }],
    { ...wire.origin, rows: wire.rows, cols: wire.cols },
  )![0]!
  const plan = preparePintaProjectedScene(JSON.stringify(wire))
  expect(plan).not.toBeNull()
  expect(plan?.decode()).toBeNull()
})
