import { expect, test } from 'bun:test'
import { makePintaHexCell, PINTA_HEX_EMPTY_CELL } from '@sistemazero/core/creations'
import { isProjectedTileLayer } from '../core/projectedDocument'
import { automapFixture } from '../testing/automapFixture'
import { CELL_FLIP_D } from '../tiles/cell'
import { prepareMapRegions } from '../tiles/regionMap'
import { inspectPintaCausalDocument } from './pintaCausalManifest'
import { provePintaCausalConsumerRemaps } from './pintaCausalTransition'
import { pintaBackupFromEncoded } from './projectJson'
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
  const spec = { itemId: hex.id, kind: hex.kind, formatVersion: 8, allowWorkshop: true }
  const text = pintaBackupFromEncoded([wire], 9)
  const admitted = inspectPintaCausalDocument(text, spec)!
  expect(admitted.manifest.refs[0]?.indices).toBe('01' + '00'.repeat(31))
  expect(admitted.manifest.refs[0]?.ruleSheetSha256).toBe(book.rules[0]!.input[0]!.sha256)
  expect(inspectPintaCausalDocument(text, { ...spec, allowWorkshop: false })).toBeNull()
  expect(inspectPintaCausalDocument(text, { ...spec, formatVersion: 7 })).toBeNull()
  const destination = structuredClone(hex)
  const targetLayer = destination.layers[0]!
  if (!isProjectedTileLayer(targetLayer) || targetLayer.cells.kind !== 'hex-regions')
    throw Error('fixture')
  targetLayer.cells.chunks[0]!.cells[0] = makePintaHexCell(1, { rotation: 120, flipX: true })!
  for (const rule of destination.automapping!.rules)
    for (const group of [rule.input, ...rule.outputs])
      for (const plane of group) {
        plane.cells = [1]
        plane.sha256 = 'b'.repeat(64)
      }
  const remap = [
    { sheetId: hex.tilesetId, operation: { type: 'remap' as const, oldToNew: [1], count: 2 } },
  ]
  expect(provePintaCausalConsumerRemaps(admitted, destination, remap)).toEqual([
    { sheetId: hex.tilesetId, mode: 'mapped' },
  ])
  targetLayer.cells.chunks[0]!.cells[0] = 1
  expect(provePintaCausalConsumerRemaps(admitted, destination, remap)).toBeNull()
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
