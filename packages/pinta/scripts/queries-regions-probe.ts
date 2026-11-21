import { createTilemapAsset, type TilemapAsset } from '../src/core/project'
import { CELL_FLIP_H, makeCell } from '../src/tiles/cell'
import { flattenMapWindow } from '../src/tiles/mapFlatten'
import {
  flattenBackground,
  flattenCellAt,
  flattenFront,
  flattenLayers,
  flattenWithTilesets,
  hasFrontLayer,
  topTileAt,
  usesMapTileset,
} from '../src/tiles/tilemapOps'
import { sparseMemoryMap } from './homologacao/memoryRegions'
import { smallQueryMap } from './homologacao/queryRegions'

export function runQueriesRegionsProbe() {
  const legacy: string[] = []
  for (let n = 0; n < 64; n++) {
    const source = createTilemapAsset({
      name: 'Legado',
      tilesetId: 'ground',
      cols: 3,
      rows: 2,
      now: 0,
    })
    const map: TilemapAsset = {
      ...source,
      id: 'map',
      layers: [
        {
          id: 'floor',
          name: 'Fundo',
          visible: true,
          cells: new Int16Array([0, 1, -1, makeCell(2, CELL_FLIP_H), -1, 3]),
        },
        { kind: 'group', id: 'group', name: 'Grupo', visible: n % 2 === 0 },
        {
          id: 'top',
          name: 'Topo',
          visible: n % 3 !== 0,
          parentId: 'group',
          front: true,
          tilesetId: n % 4 === 0 ? 'ground' : 'trees',
          cells: new Int16Array([n % 5, -1, 2, -1, 4, -1]),
        },
      ],
    }
    const include = n % 2 === 0 ? usesMapTileset(map) : undefined,
      drawable = n % 3 === 0 ? (id: string, tile: number) => id === 'ground' && tile < 3 : undefined
    const all = flattenWithTilesets(map, include, drawable)
    legacy.push(
      JSON.stringify({
        flat: Array.from(flattenLayers(map, include)),
        back: Array.from(flattenBackground(map)),
        front: Array.from(flattenFront(map)),
        has: hasFrontLayer(map, include),
        sheets: all.tilesetIds,
        tiles: Array.from(all.tiles),
        sources: Array.from(all.sources),
        points: [-1, 0, 0.5, 1, 1.5, 2, 3, NaN, Infinity].flatMap((col) =>
          [-1, 0, 0.5, 1, 1.5, 2, NaN, Infinity].map((row) => {
            const top = topTileAt(map, col, row, include, drawable)
            return [
              top?.layer.id ?? null,
              top?.tile ?? -1,
              flattenCellAt(map, col, row, include, drawable),
            ]
          }),
        ),
      }),
    )
  }
  const map = smallQueryMap(),
    world = sparseMemoryMap()
  let front = false,
    oversizedRefused = false
  try {
    front = hasFrontLayer(map)
  } catch {
    /* Historical dense-only implementation. */
  }
  // 65,792 cells: safely bounded even in the historical module, but over the output budget.
  try {
    flattenLayers({ ...world, cols: 257, rows: 256 })
  } catch (error) {
    oversizedRefused = error instanceof RangeError && error.message.includes('budget')
  }
  const window = flattenMapWindow(world, { col: -101, row: -101, cols: 3, rows: 3 })
  if (!window.ok) throw Error(window.reason)
  return {
    legacy,
    regions: {
      first: topTileAt(map, -2, -1)?.tile ?? null,
      far: topTileAt(world, 9899, 9899)?.tile ?? null,
      flat: Array.from(flattenLayers(map)),
      sources: Array.from(flattenWithTilesets(map).sources),
      front,
      oversizedRefused,
    },
    window: {
      bounds: window.grid.bounds,
      tiles: Array.from(window.grid.tiles),
      bytes: window.grid.tiles.byteLength + window.grid.sources.byteLength,
    },
  }
}
