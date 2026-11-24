import { expect, test } from 'bun:test'
import { deflateSync } from 'node:zlib'
import { pngCrc32, readPngDimensions } from './pinta-png-binary'
import { PINTA_REGION_IMAGE_PNG_LIMITS } from './pinta-region-image-limits'
import { checkAdmittedPintaPngPixels } from './pinta-region-png-pixels'

function chunk(type: string, body: Uint8Array): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(body.length + 12)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, body.length)
  bytes.set(new TextEncoder().encode(type), 4)
  bytes.set(body, 8)
  view.setUint32(body.length + 8, pngCrc32(bytes, 4, body.length + 8))
  return bytes
}

function png(
  width: number,
  height: number,
  color: number,
  depth: number,
  chunks: Uint8Array[],
  options: { adam7?: boolean; palette?: Uint8Array; splitWithText?: boolean } = {},
): Uint8Array<ArrayBuffer> {
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr.set([depth, color, 0, 0, options.adam7 ? 1 : 0], 8)
  const parts = [
    Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
    chunk('IHDR', ihdr),
    ...(options.palette ? [chunk('PLTE', options.palette)] : []),
    ...chunks.flatMap((input, index) => [
      ...(options.splitWithText && index === 1 ? [chunk('tEXt', Uint8Array.of(97, 0, 98))] : []),
      chunk('IDAT', input),
    ]),
    chunk('IEND', new Uint8Array()),
  ]
  const bytes = new Uint8Array(parts.reduce((sum, next) => sum + next.length, 0))
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.length
  }
  return bytes
}

const check = (bytes: Uint8Array<ArrayBuffer>) =>
  checkAdmittedPintaPngPixels({
    png: bytes,
    ...readPngDimensions(bytes, PINTA_REGION_IMAGE_PNG_LIMITS),
  })

test('validates every Adam7 pass on a packed indexed PNG split over small IDATs', () => {
  const rows = Uint8Array.from([2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3])
  const pixels = new Uint8Array(24)
  let at = 0
  for (const [row, size] of rows.entries()) {
    pixels[at] = row % 5
    at += size
  }
  const data = deflateSync(pixels)
  const options = { adam7: true, palette: Uint8Array.of(0, 0, 0, 255, 255, 255) }
  expect(() =>
    check(
      png(
        9,
        5,
        3,
        1,
        Array.from(data, (byte) => Uint8Array.of(byte)),
        options,
      ),
    ),
  ).not.toThrow()
  expect(() => check(png(9, 5, 3, 1, [data], { adam7: true }))).toThrow()
  expect(() =>
    check(
      png(9, 5, 3, 1, [data.subarray(0, 2), data.subarray(2)], {
        ...options,
        splitWithText: true,
      }),
    ),
  ).toThrow()
})

test('counts complete scanlines without buffering 16-bit pixels', () => {
  const pixels = new Uint8Array(512 * (256 * 8 + 1))
  const data = deflateSync(pixels)
  expect(() =>
    check(png(256, 512, 6, 16, [data.subarray(0, 100), data.subarray(100)])),
  ).not.toThrow()
  expect(() => check(png(256, 512, 6, 4, [data]))).toThrow()
  const tooMany = deflateSync(new Uint8Array(64 * 1024))
  expect(() => check(png(1, 1, 6, 8, [tooMany]))).toThrow()
})

test('CRC-valid files still reject partial, extra, and corrupt raster streams', () => {
  const complete = deflateSync(Uint8Array.of(4, 1, 2, 3, 4))
  for (const chunks of [
    [complete.subarray(0, -1)],
    [deflateSync(Uint8Array.of(5, 1, 2, 3, 4))],
    [deflateSync(Uint8Array.of(0, 1, 2, 3))],
    [deflateSync(Uint8Array.of(0, 1, 2, 3, 4, 5))],
    [complete, complete],
    [Uint8Array.from([...complete, 0])],
  ])
    expect(() => check(png(1, 1, 6, 8, chunks))).toThrow('pixels')
  const corrupt = png(1, 1, 6, 8, [complete])
  corrupt[43] = corrupt[43]! ^ 1
  expect(() => check(corrupt)).toThrow('Integridade PNG')
})

test('rejects out-of-range palette indices after reversing scanline filters', () => {
  const onlyBlack = { palette: Uint8Array.of(0, 0, 0) }
  const indexed = (...bytes: number[]) => [deflateSync(Uint8Array.from(bytes))]
  expect(() => check(png(1, 1, 3, 1, indexed(0, 0b10000000), onlyBlack))).toThrow('pixels')
  expect(() => check(png(1, 1, 3, 1, indexed(0, 0b01111111), onlyBlack))).not.toThrow()
  // Sub predicts 0x11 for the last pixel's byte. Residual 0x10 reconstructs 0x21 (index 2).
  const twoColors = { palette: Uint8Array.of(0, 0, 0, 255, 255, 255) }
  expect(() => check(png(3, 1, 3, 4, indexed(1, 0x11, 0x10), twoColors))).toThrow('pixels')
  expect(() => check(png(3, 1, 3, 4, indexed(1, 0x11, 0), twoColors))).not.toThrow()
  // Up predicts 0b01111111 in the second row. The same residual is invalid only after filtering.
  expect(() => check(png(1, 2, 3, 1, indexed(0, 0b01111111, 2, 1), onlyBlack))).toThrow('pixels')
  expect(() => check(png(1, 2, 3, 1, indexed(0, 0b01111111, 2, 0), onlyBlack))).not.toThrow()
})
