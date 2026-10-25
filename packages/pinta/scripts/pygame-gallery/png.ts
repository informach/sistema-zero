/**
 * The small PNG encoder of the Pygame-ce gallery: palette PNGs (every Pinta drawing has at most
 * 64 colours) with the best of a few filter strategies. The Pinta data block is NOT written here:
 * `drawing.ts` inserts it with the Pinta's own `pngWithPintaData`, so the block is byte for byte
 * the one "Editar no Pinta" would write.
 */
import { zlibSync } from 'fflate'
import { type Px, rgb } from './pixel'

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  out.set(new TextEncoder().encode(type), 4)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

export interface RgbaImage {
  width: number
  height: number
  /** Row-major RGBA, 4 bytes per pixel; alpha 0 = transparent. */
  pixels: Uint8Array
}

/** The RGBA pixels of a drawing, scaled by an integer factor (nearest neighbour). */
export function rgbaOf(canvas: Px, scale = 1): RgbaImage {
  const width = canvas.width * scale
  const height = canvas.height * scale
  const pixels = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const color = canvas.data[Math.floor(y / scale) * canvas.width + Math.floor(x / scale)]
      if (!color) continue
      const [r, g, b] = rgb(color)
      const at = (y * width + x) * 4
      pixels[at] = r
      pixels[at + 1] = g
      pixels[at + 2] = b
      pixels[at + 3] = 255
    }
  return { width, height, pixels }
}

const paeth = (left: number, up: number, upLeft: number) => {
  const p = left + up - upLeft
  const toLeft = Math.abs(p - left)
  const toUp = Math.abs(p - up)
  const toUpLeft = Math.abs(p - upLeft)
  return toLeft <= toUp && toLeft <= toUpLeft ? left : toUp <= toUpLeft ? up : upLeft
}

/** One scanline under PNG filter `type` (0 none, 1 sub, 2 up, 3 average, 4 paeth). */
function filterRow(
  row: Uint8Array,
  above: Uint8Array | null,
  type: number,
  pixelBytes: number,
  out: Uint8Array,
) {
  for (let x = 0; x < row.length; x++) {
    const left = x >= pixelBytes ? row[x - pixelBytes]! : 0
    const up = above ? above[x]! : 0
    const upLeft = above && x >= pixelBytes ? above[x - pixelBytes]! : 0
    const predicted =
      type === 1
        ? left
        : type === 2
          ? up
          : type === 3
            ? (left + up) >> 1
            : type === 4
              ? paeth(left, up, upLeft)
              : 0
    out[x] = (row[x]! - predicted) & 0xff
  }
}

/** How each strategy picks the filter of a row. */
const STRATEGIES: ((row: Uint8Array, above: Uint8Array | null) => number)[] = [
  () => 0,
  // A drawing scaled x2 repeats every other row: Up turns the copy into zeros.
  (row, above) => (above && row.every((value, x) => value === above[x]) ? 2 : 0),
  () => 1,
  (_, above) => (above ? 2 : 1),
  (_, above) => (above ? 4 : 1),
]

/**
 * The compressed scanlines. Pixel art compresses best with different filters than photos, so
 * every strategy is tried and the smallest result wins; the decoded pixels are always the same.
 */
function compressedRows(samples: Uint8Array, width: number, height: number, pixelBytes: number) {
  const stride = width * pixelBytes
  let best: Uint8Array | null = null
  for (const strategy of STRATEGIES) {
    const raw = new Uint8Array((stride + 1) * height)
    for (let y = 0; y < height; y++) {
      const row = samples.subarray(y * stride, (y + 1) * stride)
      const above = y > 0 ? samples.subarray((y - 1) * stride, y * stride) : null
      const type = strategy(row, above)
      raw[y * (stride + 1)] = type
      const out = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
      filterRow(row, above, type, pixelBytes, out)
    }
    const compressed = zlibSync(raw, { level: 9 })
    if (!best || compressed.length < best.length) best = compressed
  }
  return best!
}

/**
 * The drawing as palette indices when it has at most 256 colors (every Pinta drawing does):
 * one byte per pixel instead of four, the transparent color first. Null for anything else.
 */
function indexed(pixels: Uint8Array) {
  const colors = new Map<number, number>()
  const indices = new Uint8Array(pixels.length / 4)
  const key = (at: number) =>
    pixels[at + 3] === 0
      ? -1
      : ((pixels[at]! << 24) |
          (pixels[at + 1]! << 16) |
          (pixels[at + 2]! << 8) |
          pixels[at + 3]!) >>>
        0
  for (let at = 0; at < pixels.length; at += 4) if (key(at) === -1) colors.set(-1, 0)
  for (let at = 0, pixel = 0; at < pixels.length; at += 4, pixel++) {
    const color = key(at)
    let index = colors.get(color)
    if (index === undefined) {
      if (colors.size === 256) return null
      index = colors.size
      colors.set(color, index)
    }
    indices[pixel] = index
  }
  const palette = new Uint8Array(colors.size * 3)
  const alpha = new Uint8Array(colors.size)
  let partial = false
  for (const [color, index] of colors) {
    if (color === -1) continue
    palette.set([color >>> 24, (color >>> 16) & 0xff, (color >>> 8) & 0xff], index * 3)
    alpha[index] = color & 0xff
    if ((color & 0xff) !== 255) partial = true
  }
  // tRNS lists alpha up to the last non-opaque entry: just the transparent first color.
  const transparency = partial ? alpha : colors.has(-1) ? alpha.subarray(0, 1) : null
  return { indices, palette, transparency }
}

/**
 * IHDR, PLTE, tRNS (only with transparency), IDAT, IEND; RGBA when there are more than 256
 * colours. A pixel with alpha 0 is transparent whatever its RGB (it decodes as 0,0,0,0).
 */
export function encodePng(image: RgbaImage): Uint8Array {
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, image.width)
  view.setUint32(4, image.height)
  const palette = indexed(image.pixels)
  // 8 bits, palette (3) or RGBA (6), deflate, adaptive filter, no interlace
  ihdr.set([8, palette ? 3 : 6, 0, 0, 0], 8)
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
  ]
  if (palette) {
    parts.push(chunk('PLTE', palette.palette))
    if (palette.transparency) parts.push(chunk('tRNS', palette.transparency))
  }
  const idat = palette
    ? compressedRows(palette.indices, image.width, image.height, 1)
    : compressedRows(image.pixels, image.width, image.height, 4)
  parts.push(chunk('IDAT', idat), chunk('IEND', new Uint8Array()))
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}
