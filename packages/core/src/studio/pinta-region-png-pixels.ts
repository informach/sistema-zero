import { visitBoundedPintaZlib } from './pinta-region-zlib'

const ADAM7_PASSES = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
] as const
const PLAIN_PASS = [[0, 0, 1, 1]] as const
const PNG_COLORS = new Map([
  [0, { channels: 1, depths: [1, 2, 4, 8, 16] }],
  [2, { channels: 3, depths: [8, 16] }],
  [3, { channels: 1, depths: [1, 2, 4, 8] }],
  [4, { channels: 2, depths: [8, 16] }],
  [6, { channels: 4, depths: [8, 16] }],
])
const IDAT = 0x49444154
const PLTE = 0x504c5445

function invalid(): never {
  throw new Error('Os pixels de uma das imagens do cenário estão incompletos ou inválidos.')
}

function filterIndexByte(filter: number, left: number, up: number, corner: number): number {
  if (filter === 0) return 0
  if (filter === 1) return left
  if (filter === 2) return up
  if (filter === 3) return (left + up) >>> 1
  const estimate = left + up - corner
  const a = Math.abs(estimate - left),
    b = Math.abs(estimate - up),
    c = Math.abs(estimate - corner)
  return a <= b && a <= c ? left : b <= c ? up : corner
}

/** A world reader has already checked IHDR bounds, block structure and CRCs on these exact
 * bytes. Check the complete raster stream before it can reach a tolerant native decoder.
 * The sink only examines filter bytes and counts each pass; it never retains pixel rows.
 */
export function checkAdmittedPintaPngPixels(image: {
  png: Uint8Array<ArrayBuffer>
  width: number
  height: number
}): void {
  const { png, width, height } = image
  const depth = png[24]!,
    color = png[25]!,
    interlace = png[28]!
  const format = PNG_COLORS.get(color)
  if (!format?.depths.includes(depth) || png[26] !== 0 || png[27] !== 0 || interlace > 1) invalid()
  const passes = (interlace === 1 ? ADAM7_PASSES : PLAIN_PASS).flatMap(([x, y, dx, dy]) => {
    const cols = Math.ceil((width - x) / dx),
      rows = Math.ceil((height - y) / dy)
    return cols > 0 && rows > 0
      ? [{ cols, rows, bytes: 1 + Math.ceil((cols * format.channels * depth) / 8) }]
      : []
  })
  const maximum = passes.reduce((sum, { rows, bytes }) => sum + rows * bytes, 0)
  let passIndex = 0
  let rows = 0
  let offset = 0
  let filter = 0
  let paletteEntries = 0
  // An indexed image may encode an invalid palette reference behind a valid filter.
  // Only this color type needs reconstruction, which retains at most two packed rows.
  const packedWidth = color === 3 ? Math.ceil((width * depth) / 8) : 0
  let previous = packedWidth ? new Uint8Array(packedWidth) : undefined
  let current = packedWidth ? new Uint8Array(packedWidth) : undefined
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)

  function* idat() {
    let seenData = false
    let afterData = false
    let palette = false
    for (let at = 8; at + 12 <= png.length; ) {
      const length = view.getUint32(at),
        type = view.getUint32(at + 4)
      if (type === PLTE) {
        if (
          seenData ||
          palette ||
          color === 0 ||
          color === 4 ||
          !length ||
          length % 3 !== 0 ||
          length / 3 > (color === 3 ? 2 ** depth : 256)
        )
          invalid()
        palette = true
        paletteEntries = length / 3
      }
      if (type === IDAT) {
        if (afterData || (color === 3 && !palette)) invalid()
        seenData = true
        yield png.subarray(at + 8, at + 8 + length)
      } else if (seenData) afterData = true
      at += length + 12
    }
  }
  visitBoundedPintaZlib(
    idat(),
    maximum,
    (output) => {
      for (let index = 0; index < output.length; ) {
        const pass = passes[passIndex]
        if (!pass || (offset === 0 && output[index]! > 4)) invalid()
        const count = Math.min(output.length - index, pass.bytes - offset)
        if (offset === 0) filter = output[index]!
        if (current && previous)
          for (let i = offset === 0 ? 1 : 0; i < count; i++) {
            const byte = offset + i - 1
            const value =
              (output[index + i]! +
                filterIndexByte(
                  filter,
                  current[byte - 1] ?? 0,
                  previous[byte]!,
                  previous[byte - 1] ?? 0,
                )) &
              255
            current[byte] = value
            const first = byte * (8 / depth)
            const pixels = Math.min(8 / depth, pass.cols - first)
            for (let pixel = 0; pixel < pixels; pixel++)
              if (((value >>> (8 - (pixel + 1) * depth)) & ((1 << depth) - 1)) >= paletteEntries)
                invalid()
          }
        index += count
        offset += count
        if (offset < pass.bytes) continue
        offset = 0
        rows++
        if (current && previous) {
          const older = previous
          previous = current
          current = older
        }
        if (rows === pass.rows) {
          rows = 0
          passIndex++
          previous?.fill(0)
        }
      }
    },
    invalid,
    invalid,
  )
  if (passIndex !== passes.length) invalid()
}
