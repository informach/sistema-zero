import {
  encodePintaRegionLayers,
  PINTA_REGION_CELL_COUNT,
  PINTA_REGION_LIMITS,
  PINTA_REGION_SIDE,
  type PintaRegionBounds,
  type PintaRegionCells,
} from '@sistemazero/core/creations'
import { TiledImportError } from './errors'

const { maxChunks, minCoordinate, maxCoordinateExclusive } = PINTA_REGION_LIMITS
const lowest = minCoordinate - PINTA_REGION_SIDE,
  span = maxCoordinateExclusive - minCoordinate + 2 * PINTA_REGION_SIDE

/** Tiled can repack chunks into different rectangles. Coordinates belong to the
 * map, including negative positions. Only occupied cells allocate Pinta chunks.
 *
 * The ceiling is what the Pinta keeps: the allocated 32×32 regions (`chargeRegion`) and the
 * cells read (`chargeSource`). Tiled writes its own chunk size (16×16 by default), so a valid
 * map can arrive in several times more chunks than regions. Chunks on one aligned grid are
 * checked for overlap by position; loose rectangles are compared pairwise, up to `maxChunks`.
 */
export function readRegionalTiledGrid(
  raw: unknown,
  bounds: PintaRegionBounds,
  read: (chunk: Record<string, unknown>, length: number) => number[],
  convert: (gid: number) => number,
  chargeSource: (length: number) => void,
  chargeRegion: () => void,
) {
  if (!Array.isArray(raw))
    throw new TiledImportError('As regiões da camada do Tiled são inválidas.')
  const chunks = new Map<string, PintaRegionCells['chunks'][number]>()
  const rectangles: Array<{
    x: number
    y: number
    right: number
    bottom: number
  }> = []
  // `undefined` until the first chunk; `null` once a chunk leaves the shared grid.
  let grid: { width: number; height: number; taken: Set<number> } | null | undefined
  for (const chunk of raw) {
    if (!chunk || typeof chunk !== 'object' || Array.isArray(chunk))
      throw new TiledImportError('Uma região da camada do Tiled é inválida.')
    const body: Record<string, unknown> = chunk
    const { x, y, width, height } = body
    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      typeof width !== 'number' ||
      typeof height !== 'number' ||
      !Number.isSafeInteger(x) ||
      !Number.isSafeInteger(y) ||
      !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      width < 1 ||
      height < 1 ||
      x < minCoordinate - PINTA_REGION_SIDE ||
      y < minCoordinate - PINTA_REGION_SIDE ||
      x + width > maxCoordinateExclusive + PINTA_REGION_SIDE ||
      y + height > maxCoordinateExclusive + PINTA_REGION_SIDE
    )
      throw new TiledImportError('Uma região do Tiled tem coordenadas ou medidas inválidas.')
    const right = x + width,
      bottom = y + height
    if (
      grid !== null &&
      (!grid || (grid.width === width && grid.height === height)) &&
      x % width === 0 &&
      y % height === 0
    ) {
      grid ??= { width, height, taken: new Set() }
      const key =
        Math.floor((x - lowest) / width) * (Math.floor(span / height) + 2) +
        Math.floor((y - lowest) / height)
      if (grid.taken.has(key))
        throw new TiledImportError('Duas regiões da mesma camada se sobrepõem no Tiled.')
      grid.taken.add(key)
    } else {
      grid = null
      if (rectangles.length >= maxChunks)
        throw new TiledImportError('As regiões da camada do Tiled são inválidas.')
      if (rectangles.some((r) => x < r.right && r.x < right && y < r.bottom && r.y < bottom))
        throw new TiledImportError('Duas regiões da mesma camada se sobrepõem no Tiled.')
    }
    // Past `maxChunks` only the aligned grid is accepted, so the list stops growing there.
    if (rectangles.length < maxChunks) rectangles.push({ x, y, right, bottom })
    const length = width * height
    chargeSource(length)
    for (const [index, gid] of read(body, length).entries()) {
      if (!gid) continue
      const cellX = x + (index % width),
        cellY = y + Math.floor(index / width)
      if (
        cellX < bounds.col ||
        cellY < bounds.row ||
        cellX >= bounds.col + bounds.cols ||
        cellY >= bounds.row + bounds.rows
      )
        throw new TiledImportError(
          'Há peças fora da área original do mapa. Ajuste pinta:bounds antes de importar.',
        )
      const col = Math.floor(cellX / PINTA_REGION_SIDE),
        row = Math.floor(cellY / PINTA_REGION_SIDE)
      const key = `${col},${row}`
      let target = chunks.get(key)
      if (!target) {
        chargeRegion()
        target = {
          col,
          row,
          cells: new Int16Array(PINTA_REGION_CELL_COUNT).fill(-1),
        }
        chunks.set(key, target)
      }
      target.cells[
        (cellY - row * PINTA_REGION_SIDE) * PINTA_REGION_SIDE + cellX - col * PINTA_REGION_SIDE
      ] = convert(gid)
    }
  }
  const grids = encodePintaRegionLayers(
    [
      {
        kind: 'regions',
        version: 1,
        side: PINTA_REGION_SIDE,
        chunks: [...chunks.values()],
      },
    ],
    bounds,
  )
  if (!grids?.[0]) throw new TiledImportError('Não foi possível conferir as regiões do mapa.')
  return grids[0]
}
