import { strict as assert } from 'node:assert'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  isTileLayer,
  type RegionTilemapAsset,
  sanitizePintaAsset,
} from '../../src/core/project'
import { decodeRegionMapDocument, encodeRegionMapDocument } from '../../src/core/regionDocument'
import { makeCell } from '../../src/tiles/cell'
import { editRegionMapCells, expandRegionMap, prepareMapRegions } from '../../src/tiles/regionMap'

const label = process.argv[2]
assert(label && /^[a-z0-9-]{1,60}$/.test(label), 'Supply a unique report label')
const output = resolve(import.meta.dir, '../../../../.cache', `pinta-region-document-${label}`)
let state = 20261121
function next(max: number) {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0
  return state % max
}

let resourceCases = 0,
  maximumExtentCases = 0
for (let index = 0; index < 100; index++) {
  const dense = createTilemapAsset({
    name: 'vila',
    tilesetId: 'terra',
    cols: 16,
    rows: 16,
    now: 100,
  })
  dense.id = `qa-map-${index}`
  dense.layers[0]!.id = 'floor'
  dense.layers[0]!.cells![0] = 7
  const initial = structuredClone(dense)
  const prepared = prepareMapRegions(dense)
  assert(prepared.ok)
  const axis = index % 3 === 0 ? 10000 : 128
  if (axis === 10000) maximumExtentCases++
  const expanded = expandRegionMap(prepared.map, { col: -64, row: -64, cols: axis, rows: axis })
  assert(expanded.ok)
  const floor = expanded.map.layers[0]!
  assert(isTileLayer(floor))
  const map: RegionTilemapAsset = {
    ...expanded.map,
    physics: 'precise',
    layers: [
      { ...floor, opacity: index % 2, front: false, offsetX: -20000.25 },
      {
        kind: 'objects',
        id: 'doors',
        name: 'Portas',
        visible: true,
        objects: [
          {
            id: 'door',
            name: 'Cabana',
            type: 'door',
            role: 'door',
            shape: 'ellipse',
            x: -next(10000) - 0.5,
            y: next(10000) + 0.25,
            width: 16.75,
            height: 32,
            rotation: index % 2 ? 1.1 : 0,
            collision: true,
            properties: { enabled: false, arrival: { type: 'object', value: 'spawn' } },
          },
        ],
      },
    ],
  }
  if (index % 10 === 0) {
    map.resources = [
      {
        sourceId: 'tree-original',
        capturedAt: 200,
        asset: {
          ...createPixelSpriteAsset({ name: 'arvore', frameSize: 16, now: 100 }),
          id: 'tree-snapshot',
        },
      },
    ]
    resourceCases++
  }
  const before = structuredClone(map)
  const edits = Array.from({ length: 16 }, () => ({
    col: next(axis) - 64,
    row: next(axis) - 64,
    cell: makeCell(next(256), next(8) << 12),
  }))
  const edited = editRegionMapCells(map, 'floor', edits)
  assert(edited.ok)
  const document = encodeRegionMapDocument(edited.map)
  assert(document)
  const serialized = JSON.stringify(document)
  assert.deepEqual(decodeRegionMapDocument(JSON.parse(serialized)), edited.map)
  assert.equal(sanitizePintaAsset(document), null)
  assert.deepEqual(map, before)
  assert.deepEqual(dense, initial)
}

const report = {
  at: new Date().toISOString(),
  seed: 20261121,
  cases: 100,
  resourceCases,
  maximumExtentCases,
  ordinaryJsonRoundTrips: 100,
  historicalReaderRefusals: 100,
  unchangedSnapshots: 200,
  scope:
    'Synthetic internal codec/migration checks on this machine; no editor UI, staging, engine or performance qualification',
}
mkdirSync(output, { recursive: true })
writeFileSync(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, {
  flag: 'wx',
})
console.log(JSON.stringify(report))
