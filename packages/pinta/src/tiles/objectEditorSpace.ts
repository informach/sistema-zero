import { effectiveLayer } from '../core/project'
import type { AuthorMap } from './mapCellEdits'
import { mapCellBounds } from './mapCells'
import { createMapObject, createRegionMapObject, snapObjectPoint, snapToGrid } from './mapObjects'

type Point = { x: number; y: number }
/** The existing SVG uses pixel units; keep its legacy arithmetic order exactly. */
export function objectEditorSpace(
  map: AuthorMap,
  layerId: string | null,
  tileSize: number,
  pad: number,
  snap: boolean,
) {
  const bounds = mapCellBounds(map),
    signed = 'origin' in map,
    layer = map.layers.find((layer) => layer.id === layerId),
    offset = layer ? effectiveLayer(map, layer) : { offsetX: 0, offsetY: 0 },
    width = map.cols * tileSize,
    height = map.rows * tileSize,
    worldLeft = bounds.col * tileSize,
    worldTop = bounds.row * tileSize,
    left = signed ? worldLeft - offset.offsetX : 0,
    top = signed ? worldTop - offset.offsetY : 0,
    right = signed ? worldLeft + width - offset.offsetX : width,
    bottom = signed ? worldTop + height - offset.offsetY : height,
    ring = pad * tileSize
  return {
    left,
    top,
    right,
    bottom,
    offset,
    viewBox: `${worldLeft - ring} ${worldTop - ring} ${width + 2 * ring} ${height + 2 * ring}`,
    fromClient(
      point: Point,
      box: { left: number; top: number; width: number; height: number },
    ): Point | null {
      if (
        ![point.x, point.y, box.left, box.top, box.width, box.height].every(Number.isFinite) ||
        box.width <= 0 ||
        box.height <= 0
      )
        return null
      return {
        x:
          ((point.x - box.left) * (width + 2 * ring)) / box.width -
          ring -
          offset.offsetX +
          worldLeft,
        y:
          ((point.y - box.top) * (height + 2 * ring)) / box.height -
          ring -
          offset.offsetY +
          worldTop,
      }
    },
    clampX(value: number, size = 0): number {
      return signed
        ? Math.max(left, Math.min(value, right - size))
        : Math.min(Math.max(value, 0), width - size)
    },
    clampY(value: number, size = 0): number {
      return signed
        ? Math.max(top, Math.min(value, bottom - size))
        : Math.min(Math.max(value, 0), height - size)
    },
    snapEdge(value: number): number {
      return snap ? snapToGrid(value, tileSize) : signed ? value : Math.round(value)
    },
    snapPoint(value: number): number {
      return signed && !snap ? value : snapObjectPoint(value, tileSize, snap)
    },
    contains(point: Point): boolean {
      return (
        Number.isFinite(point.x) &&
        Number.isFinite(point.y) &&
        point.x >= left &&
        point.y >= top &&
        point.x <= right &&
        point.y <= bottom
      )
    },
    createObject(input: Parameters<typeof createMapObject>[0]) {
      return signed ? createRegionMapObject(input) : createMapObject(input)
    },
  }
}
