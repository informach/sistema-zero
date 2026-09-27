import { expect, test } from 'bun:test'
import { MOLDA_LIMITS } from '../core/limits'
import { encodePng } from '../export/png'
import { inspectReferenceRaster, ReferenceImageError } from './rasterHeader'

test('reads native PNG dimensions and typed-array offsets without decoding pixels', () => {
  const png = encodePng(new Uint8Array(3 * 2 * 4), 3, 2)
  expect(inspectReferenceRaster(png)).toEqual({ width: 3, height: 2, mime: 'image/png' })
  const padded = new Uint8Array(png.length + 7)
  padded.set(png, 7)
  expect(inspectReferenceRaster(padded.subarray(7))).toEqual(inspectReferenceRaster(png))
  for (let i = 0; i < png.length; i++)
    expect(() => inspectReferenceRaster(png.subarray(0, i))).toThrow(ReferenceImageError)
})

test('rejects oversized dimensions, animated chunks and a forged signature before decoding', () => {
  const png = encodePng(new Uint8Array(16), 2, 2)
  const wide = png.slice()
  new DataView(wide.buffer).setUint32(16, 50_000)
  expect(() => inspectReferenceRaster(wide)).toThrow(new ReferenceImageError('size'))
  const animation = png.slice()
  new DataView(animation.buffer).setUint32(37, 0x6163544c) // replace IDAT type with acTL
  expect(() => inspectReferenceRaster(animation)).toThrow(new ReferenceImageError('animated'))
  expect(() => inspectReferenceRaster(new Uint8Array(MOLDA_LIMITS.referenceFileBytes + 1))).toThrow(
    new ReferenceImageError('size'),
  )
  expect(() =>
    inspectReferenceRaster(new TextEncoder().encode('<svg onload="alert(1)"/>')),
  ).toThrow(new ReferenceImageError('format'))
})

test('JPEG preflight traverses bounded markers and accepts baseline/progressive dimension headers', () => {
  // SOI, APP0(length 4), SOF(length 17, 8bit, 2 rows, 3 columns, 3 components).
  const jpeg = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 17, 8, 0, 2, 0, 3, 3, 1, 0x11, 0, 2, 0x11, 0,
    3, 0x11, 0,
  ])
  expect(inspectReferenceRaster(jpeg)).toEqual({ width: 3, height: 2, mime: 'image/jpeg' })
  jpeg[9] = 0xc2
  expect(inspectReferenceRaster(jpeg).mime).toBe('image/jpeg')
  for (let i = 0; i < jpeg.length; i++)
    expect(() => inspectReferenceRaster(jpeg.subarray(0, i))).toThrow(ReferenceImageError)
  jpeg[4] = 0xff
  expect(() => inspectReferenceRaster(jpeg)).toThrow(ReferenceImageError)
})
