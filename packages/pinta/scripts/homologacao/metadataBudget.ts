/** Canonical native-8 fixture near the existing cumulative text budget. */
import { REGION_METADATA_BUDGET } from '../../src/core/mapDocumentBoundary'
import {
  createTilemapAsset,
  isObjectLayer,
  isTileLayer,
  type RegionTilemapAsset,
  sanitizeRegionTilemapAsset,
} from '../../src/core/project'
import { addMapObject, createRegionMapObject } from '../../src/tiles/mapObjects'
import { editRegionMapCells, prepareMapRegions } from '../../src/tiles/regionMap'
import { addObjectLayer } from '../../src/tiles/tilemapOps'

function stringUnits(map: RegionTilemapAsset): number {
  const metadata = {
    ...map,
    layers: map.layers.map((layer) => {
      if (!isTileLayer(layer)) return layer
      const { cells: _cells, ...rest } = layer
      return rest
    }),
  }
  // Independent JSON oracle: string tokens count keys and values, never array indices.
  return [...JSON.stringify(metadata).matchAll(/"(?:\\.|[^"\\])*"/g)].reduce(
    (sum, token) => sum + (JSON.parse(token[0]) as string).length,
    0,
  )
}

let fixture: ReturnType<typeof build> | undefined
function build() {
  const prepared = prepareMapRegions(
    createTilemapAsset({ name: 'dados', tilesetId: 'ground', cols: 2, rows: 2, now: 0 }),
  )
  if (!prepared.ok) throw Error(prepared.reason)
  const painted = editRegionMapCells(prepared.map, prepared.map.layers[0]!.id, [
    { col: 0, row: 0, cell: 0 },
  ])
  if (!painted.ok) throw Error(painted.reason)
  let map = painted.map
  for (let i = 0; i < 5; i++) map = addObjectLayer(map, `Dados ${i}`)
  const properties = Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [`p${i}`, 'a'.repeat(200)]),
  )
  const objects = Array.from({ length: 2560 }, (_, i) => {
    const object = createRegionMapObject({
      id: `o-${i}`,
      name: 'Ponto',
      shape: 'point',
      properties,
    })
    if (!object) throw Error('Objeto inválido')
    return object
  })
  const candidate = (count: number): RegionTilemapAsset => {
    let at = 0
    return {
      ...map,
      layers: map.layers.map((layer) => {
        if (!isObjectLayer(layer)) return layer
        const start = at
        at += 512
        return { ...layer, objects: objects.slice(start, Math.min(at, Math.max(start, count))) }
      }),
    }
  }
  let lo = 0,
    hi = objects.length
  while (lo < hi) {
    const middle = Math.ceil((lo + hi) / 2)
    if (sanitizeRegionTilemapAsset(candidate(middle))) lo = middle
    else hi = middle - 1
  }
  if (!lo || lo === objects.length) throw Error('A fixture não alcançou o orçamento')
  const source = candidate(lo),
    last = source.layers.filter(isObjectLayer).at(-1)!
  const over = addMapObject(source, last.id, objects[lo]!)
  if (!sanitizeRegionTilemapAsset(source) || sanitizeRegionTilemapAsset(over))
    throw Error('Fronteira de metadados inválida')
  let padding = REGION_METADATA_BUDGET.maxStringUnits - 1 - stringUnits(source)
  const border: RegionTilemapAsset = {
    ...source,
    layers: source.layers.map((layer) =>
      !isObjectLayer(layer)
        ? layer
        : {
            ...layer,
            objects: layer.objects.map((object) => {
              if (!padding) return object
              const count = Math.min(48, padding)
              padding -= count
              return { ...object, type: 'x'.repeat(count) }
            }),
          },
    ),
  }
  if (
    padding ||
    stringUnits(border) !== REGION_METADATA_BUDGET.maxStringUnits - 1 ||
    !sanitizeRegionTilemapAsset(border)
  )
    throw Error('Padding inválido')
  return { source, over, border, objects: lo, sourceUnits: stringUnits(source) }
}
/** Immutable shared fixture: commands and stores must never mutate these revisions. */
export function metadataBudgetFixture() {
  if (!fixture) fixture = build()
  return fixture
}

let escaped: RegionTilemapAsset | undefined
/** Same authorial text units, but JSON escaping exceeds the portable file budget. */
export function escapedMetadataFixture(): RegionTilemapAsset {
  if (!escaped) {
    const { source } = metadataBudgetFixture()
    escaped = {
      ...source,
      layers: source.layers.map((layer) =>
        !isObjectLayer(layer)
          ? layer
          : {
              ...layer,
              objects: layer.objects.map((object) => ({
                ...object,
                properties: Object.fromEntries(
                  Object.entries(object.properties).map(([key, value]) => [
                    key,
                    typeof value === 'string' ? '\0'.repeat(value.length) : value,
                  ]),
                ),
              })),
            },
      ),
    }
  }
  return escaped
}
