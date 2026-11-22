export const PINTA_HEX_EMPTY_CELL = 0xffffffff
export const PINTA_HEX_TILE_MASK = 0x00000fff

/** The upper four bits have the hexagonal meaning used by Tiled GIDs.
 * The low bits are a zero-based local tile. Bits 12–27 are reserved.
 */
export const PINTA_HEX_CELL_FLAGS = Object.freeze({
  flipX: 0x80000000,
  flipY: 0x40000000,
  rotate60: 0x20000000,
  rotate120: 0x10000000,
})
const reserved = 0x0ffff000
type Transform = Readonly<{
  flipX?: boolean
  flipY?: boolean
  rotation?: 0 | 60 | 120 | 180 | 240 | 300
}>

export function isPintaHexCell(cell: number): boolean {
  return (
    Number.isInteger(cell) &&
    cell >= 0 &&
    cell <= PINTA_HEX_EMPTY_CELL &&
    (cell === PINTA_HEX_EMPTY_CELL || (cell & reserved) === 0)
  )
}

/** Read the local tile index of an already admitted cell. */
export function pintaHexCellTile(cell: number): number {
  return cell === PINTA_HEX_EMPTY_CELL ? -1 : cell & PINTA_HEX_TILE_MASK
}

export function makePintaHexCell(tile: number, transform: Transform = {}): number | null {
  if (!Number.isInteger(tile) || tile < 0 || tile > PINTA_HEX_TILE_MASK) return null
  const rotation = transform.rotation ?? 0
  if (![0, 60, 120, 180, 240, 300].includes(rotation)) return null
  // A double flip is a half turn. It makes 240° and 300° expressible without
  // changing the format or interpreting the square-grid diagonal as a turn.
  const extraHalfTurn = rotation >= 240
  const steps = (rotation - (extraHalfTurn ? 180 : 0)) / 60
  const flipX = !!transform.flipX !== extraHalfTurn
  const flipY = !!transform.flipY !== extraHalfTurn
  return (
    (tile |
      (flipX ? PINTA_HEX_CELL_FLAGS.flipX : 0) |
      (flipY ? PINTA_HEX_CELL_FLAGS.flipY : 0) |
      (steps & 1 ? PINTA_HEX_CELL_FLAGS.rotate60 : 0) |
      (steps & 2 ? PINTA_HEX_CELL_FLAGS.rotate120 : 0)) >>>
    0
  )
}

/** Flip about the image center in its local axes, then turn clockwise. */
export function unpackPintaHexCell(cell: number) {
  if (!isPintaHexCell(cell) || cell === PINTA_HEX_EMPTY_CELL) return null
  return {
    tile: pintaHexCellTile(cell),
    flipX: (cell & PINTA_HEX_CELL_FLAGS.flipX) !== 0,
    flipY: (cell & PINTA_HEX_CELL_FLAGS.flipY) !== 0,
    rotation:
      (cell & PINTA_HEX_CELL_FLAGS.rotate60 ? 60 : 0) +
      (cell & PINTA_HEX_CELL_FLAGS.rotate120 ? 120 : 0),
  }
}
