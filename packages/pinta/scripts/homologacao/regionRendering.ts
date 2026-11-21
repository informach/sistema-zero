/** Shared QA fixture; never imported by the application. */
import {
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  type RegionTilemapAsset,
  type TilemapAsset,
} from '../../src/core/project'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, cellTile, makeCell } from '../../src/tiles/cell'
import { editRegionMapCells, prepareMapRegions } from '../../src/tiles/regionMap'

export function makeRegionRenderFixture(
  createCanvas: (width: number, height: number) => HTMLCanvasElement,
) {
  const tileset = createTilesetAsset({ name: 'peças', tileSize: 16 })
  tileset.tiles = Array.from({ length: 4 }, () => tileset.tiles[0]!)
  tileset.animations = {
    '1': [
      { tile: 2, duration: 80 },
      { tile: 3, duration: 120 },
    ],
  }
  const sheet = createCanvas(64, 16),
    ctx = sheet.getContext('2d')!
  for (let tile = 0; tile < 4; tile++)
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        ctx.fillStyle = `rgba(${tile * 63},${x * 16},${y * 16},${((x + y + tile) % 5) / 4})`
        ctx.fillRect(tile * 16 + x, y, 1, 1)
      }
  const base = createTilemapAsset({ name: 'Mapa', tilesetId: tileset.id, cols: 64, rows: 64 }),
    flags = [0, CELL_FLIP_H, CELL_FLIP_V, CELL_FLIP_D | CELL_FLIP_H],
    map: TilemapAsset = {
      ...base,
      layers: [
        {
          id: 'group',
          kind: 'group',
          name: 'Grupo',
          visible: true,
          opacity: 0.75,
          offsetX: 0.5,
          offsetY: -0.25,
        },
        ...Array.from({ length: 3 }, (_, layer) => ({
          id: `layer-${layer}`,
          name: `Camada ${layer}`,
          visible: true,
          parentId: 'group',
          opacity: layer % 2 ? 0.45 : 1,
          offsetX: layer * 4,
          offsetY: -layer * 4,
          cells: Int16Array.from({ length: 4096 }, (_, i) =>
            i % 11 === 0 ? -1 : makeCell((i + layer) % 4, flags[(i + layer) % 4]),
          ),
        })),
      ],
    }
  return { map, tileset, sheet: sheet as unknown as HTMLCanvasElement }
}
/** At every tested zoom, the direct path requires integer destinations and no sampled flips. */
export function integerPixelRenderFixture(
  data: ReturnType<typeof makeRegionRenderFixture>,
  fullLayerOpacity = false,
) {
  const map: TilemapAsset = {
    ...data.map,
    layers: data.map.layers.map((layer) => {
      const offsets = {
        offsetX: Math.round((layer.offsetX ?? 0) / 4) * 4,
        offsetY: Math.round((layer.offsetY ?? 0) / 4) * 4,
        ...(fullLayerOpacity ? { opacity: 1 } : {}),
      }
      return isTileLayer(layer)
        ? { ...layer, ...offsets, cells: layer.cells.map(cellTile) }
        : { ...layer, ...offsets }
    }),
  }
  return { ...data, map }
}

/** Translation of the tile-only QA fixture, not a general authoring operation. */
export function translatedRegionRenderMap(
  map: TilemapAsset,
  col: number,
  row: number,
): RegionTilemapAsset {
  const prepared = prepareMapRegions(map)
  if (!prepared.ok) throw Error(prepared.reason)
  let result: RegionTilemapAsset = {
    ...prepared.map,
    origin: { col, row },
    layers: prepared.map.layers.map((l) =>
      isTileLayer(l) ? { ...l, cells: { ...l.cells, chunks: [] } } : l,
    ),
  }
  for (const layer of map.layers) {
    if (!isTileLayer(layer)) continue
    const edits = Array.from(layer.cells, (cell, index) => ({
        col: col + (index % map.cols),
        row: row + Math.floor(index / map.cols),
        cell,
      })).filter((e) => e.cell >= 0),
      edited = editRegionMapCells(result, layer.id, edits)
    if (!edited.ok) throw Error(edited.reason)
    result = edited.map
  }
  return result
}
/** Match the existing global chunk grid: an arbitrary shift also moves its raster boundaries. */
export function alignedDenseRenderReference(map: TilemapAsset, col: number, row: number) {
  const origin = { col: ((col % 32) + 32) % 32, row: ((row % 32) + 32) % 32 },
    cols = map.cols + origin.col,
    rows = map.rows + origin.row,
    reference: TilemapAsset = {
      ...map,
      cols,
      rows,
      layers: map.layers.map((layer) => {
        if (!isTileLayer(layer)) return layer
        const cells = new Int16Array(cols * rows).fill(-1)
        for (let r = 0; r < map.rows; r++)
          cells.set(
            layer.cells.subarray(r * map.cols, (r + 1) * map.cols),
            (r + origin.row) * cols + origin.col,
          )
        return { ...layer, cells }
      }),
    }
  return { map: reference, origin }
}
