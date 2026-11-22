import { expect, test } from 'bun:test'
import { makePintaHexCell, PINTA_HEX_EMPTY_CELL } from '@sistemazero/core/creations'
import { isProjectedTileLayer } from '../core/projectedDocument'
import { automapFixture } from '../testing/automapFixture'
import { CELL_FLIP_D } from '../tiles/cell'
import { prepareMapRegions } from '../tiles/regionMap'
import {
  decodeWorkshopProjectedMap,
  encodeWorkshopProjectedMap,
  sanitizeWorkshopProjectedMap,
  type WorkshopProjectedMap,
} from './workshopProjection'

test('corpo projetado tem um único discriminante no mapa e livro v1 confere camadas também no hex', async () => {
  const { map, book } = await automapFixture()
  const regional = prepareMapRegions(map)
  if (!regional.ok) throw Error(regional.reason)
  const hexCells = new Uint32Array(1024).fill(PINTA_HEX_EMPTY_CELL)
  hexCells[0] = makePintaHexCell(0, { rotation: 120, flipX: true })!
  const hex: WorkshopProjectedMap = {
    ...regional.map,
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
    layers: regional.map.layers.map((layer, i) =>
      isProjectedTileLayer(layer)
        ? {
            ...layer,
            cells: {
              kind: 'hex-regions',
              side: 32,
              version: 1,
              chunks: i === 0 ? [{ col: 0, row: 0, cells: hexCells }] : [],
            },
          }
        : layer,
    ),
    automapping: book,
  }
  const wire = encodeWorkshopProjectedMap(hex)
  expect(wire?.capability).toBe('projection')
  expect(wire?.map).not.toHaveProperty('automapping')
  expect(wire?.book).toEqual(book)
  expect(decodeWorkshopProjectedMap(JSON.parse(JSON.stringify(wire)))).toEqual(hex)
  expect(sanitizeWorkshopProjectedMap(hex)).toEqual(hex)
  const rotated = structuredClone(book)
  rotated.rules[0]!.outputs[0]![0]!.cells[0] = CELL_FLIP_D
  expect(encodeWorkshopProjectedMap({ ...hex, automapping: rotated })).toBeNull()
  for (const raw of [
    { ...wire, id: 'outro' },
    { ...wire, projection: hex.projection },
    { ...wire, map: { ...wire!.map, unread: true } },
    { ...wire, book: rotated },
  ])
    expect(decodeWorkshopProjectedMap(raw)).toBeNull()
  const iso: WorkshopProjectedMap = {
    ...regional.map,
    schema: 9,
    growth: 'expandable',
    physics: 'precise',
    projection: { kind: 'isometric', tileWidth: 32, tileHeight: 16 },
    automapping: rotated,
  }
  const isoWire = encodeWorkshopProjectedMap(iso)!
  expect(decodeWorkshopProjectedMap(JSON.parse(JSON.stringify(isoWire)))).toEqual(iso)
})
