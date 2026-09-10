import { expect, test } from 'bun:test'
import sharp from 'sharp'
import {
  editJpegSegment,
  joinJpegBytes,
  jpegHeader,
  jpegSegment,
  prependJpegSegments,
} from '../testing/jpegFixture'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'
import { decodeGltfJpeg } from './gltfJpeg'
import { planGltfJpeg } from './gltfJpegPlan'

function fails(run: () => unknown, reason: GltfInputError['reason'] = 'invalid') {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  if (!(error instanceof GltfInputError)) throw new Error('Expected a structured JPEG error')
  expect(error.reason).toBe(reason)
  expect(error.path).toBe('image')
  return error
}

const solid = (
  progressive = false,
  width = 17,
  height = 11,
  chromaSubsampling: '4:4:4' | '4:2:0' = '4:4:4',
) =>
  sharp({ create: { width, height, channels: 3, background: { r: 140, g: 65, b: 210 } } })
    .jpeg({ progressive, chromaSubsampling, quality: 95 })
    .toBuffer()

async function oracle(bytes: Uint8Array) {
  // No autoOrient / ICC transform. Decode the file, not the lossy source pixels.
  return sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
}

test('baseline and progressive JPEG decode owned top-down RGBA, compared to libjpeg on 4:4:4 gradients', async () => {
  for (const progressive of [false, true])
    for (const [width, height] of [
      [1, 1],
      [7, 9],
      [17, 11],
      [33, 21],
    ]) {
      const raw = Uint8Array.from(
        { length: width! * height! * 3 },
        (_, i) =>
          (Math.floor(i / 3 / width!) * 7 + (Math.floor(i / 3) % width!) * 3 + (i % 3) * 27) % 256,
      )
      const bytes = await sharp(raw, { raw: { width: width!, height: height!, channels: 3 } })
        .jpeg({ progressive, quality: 95, chromaSubsampling: '4:4:4' })
        .toBuffer()
      const original = new Uint8Array(bytes),
        result = decodeGltfJpeg(bytes),
        expected = await oracle(bytes)
      expect([result.width, result.height, result.depth]).toEqual([width!, height!, 8])
      expect(result.rgba).toBeInstanceOf(Uint8Array)
      expect(result.rgba.buffer).not.toBe(bytes.buffer)
      // Integer IDCT and YCbCr rounding differ between codecs, not orientation.
      expect(
        Math.max(...result.rgba.map((v, i) => Math.abs(v - expected.data[i]!))),
      ).toBeLessThanOrEqual(3)
      expect(new Uint8Array(bytes)).toEqual(original)
      for (let i = 3; i < result.rgba.length; i += 4) expect(result.rgba[i]).toBe(255)
    }
})

test('grayscale, chroma subsampling and extended sequential use real JPEG entropy', async () => {
  for (const progressive of [false, true])
    for (const sampling of ['4:4:4', '4:2:0'] as const) {
      const bytes = await solid(progressive, 31, 19, sampling)
      const variants = [
        bytes,
        await sharp(bytes).toColourspace('b-w').jpeg({ progressive }).toBuffer(),
      ]
      if (!progressive)
        variants.push(Buffer.from(editJpegSegment(bytes, 0xc0, (data) => data, 0xc1)))
      for (const value of variants) {
        const result = decodeGltfJpeg(value),
          expected = await oracle(value)
        expect(result.rgba.length).toBe(31 * 19 * 4)
        expect(
          Math.max(...result.rgba.map((v, i) => Math.abs(v - expected.data[i]!))),
        ).toBeLessThanOrEqual(2)
      }
    }
})

test('RGB component IDs and Adobe transform 0 are not accidentally converted as YCbCr', async () => {
  let bytes: Uint8Array = await solid()
  // The entropy stores three independent channels. Re-labeling them creates a
  // valid RGB JPEG whose RGB samples are the old Y/Cb/Cr samples, not the old RGB.
  const ids = [82, 71, 66]
  bytes = editJpegSegment(bytes, 0xc0, (data) => {
    for (let i = 0; i < 3; i++) data[6 + i * 3] = ids[i]!
    return data
  })
  bytes = editJpegSegment(bytes, 0xda, (data) => {
    for (let i = 0; i < 3; i++) data[1 + i * 2] = ids[i]!
    return data
  })
  const jfif = jpegHeader(bytes).find((part) => part.code === 0xe0)
  if (jfif) bytes = joinJpegBytes([bytes.subarray(0, jfif.start), bytes.subarray(jfif.end)])
  const adobe = jpegSegment(0xee, Uint8Array.of(65, 100, 111, 98, 101, 0, 100, 0, 0, 0, 0, 0))
  for (const candidate of [bytes, prependJpegSegments(bytes, [adobe])]) {
    expect(planGltfJpeg(candidate).colorTransform).toBe(false)
    const result = decodeGltfJpeg(candidate),
      expected = await oracle(candidate)
    expect(
      Math.max(...result.rgba.map((v, i) => Math.abs(v - expected.data[i]!))),
    ).toBeLessThanOrEqual(1)
    expect(result.rgba[0]).not.toBe(140)
  }
  const ordinary = await solid(),
    jfifMarker = jpegSegment(0xe0, Uint8Array.of(74, 70, 73, 70, 0, 1, 2, 0, 0, 1, 0, 1, 0, 0)),
    withAdobe = prependJpegSegments(ordinary, [jfifMarker, adobe])
  // JFIF wins even when Adobe says untransformed components.
  expect(planGltfJpeg(withAdobe).colorTransform).toBe(true)
  expect(decodeGltfJpeg(withAdobe).rgba).toEqual(decodeGltfJpeg(ordinary).rgba)
  const numericIds = editJpegSegment(
    editJpegSegment(bytes, 0xc0, (data) => {
      for (let i = 0; i < 3; i++) data[6 + i * 3] = i + 1
      return data
    }),
    0xda,
    (data) => {
      for (let i = 0; i < 3; i++) data[1 + i * 2] = i + 1
      return data
    },
  )
  const adobeRgb = prependJpegSegments(numericIds, [adobe])
  expect(planGltfJpeg(adobeRgb).colorTransform).toBe(false)
  expect(decodeGltfJpeg(adobeRgb).rgba).toEqual(decodeGltfJpeg(bytes).rgba)
})

test('EXIF orientation, ICC, comments and physical metadata do not alter glTF raster pixels', async () => {
  const bytes = await solid(false, 17, 9),
    expected = decodeGltfJpeg(bytes)
  const annotated = await sharp(bytes)
    .withExif({ IFD0: { Orientation: '6' } })
    .jpeg({ quality: 100 })
    .toBuffer()
  const header = jpegHeader(annotated),
    metadata = header.filter((part) => part.code === 0xe1)
  expect(metadata.length).toBeGreaterThan(0)
  const candidate = prependJpegSegments(bytes, [
    ...metadata.map((part) => annotated.subarray(part.start, part.end)),
    jpegSegment(0xe2, new TextEncoder().encode('ICC_PROFILE\0\x01\x01not-a-profile')),
    jpegSegment(0xfe, new TextEncoder().encode('do not run this text')),
    jpegSegment(0xef, Uint8Array.of(1, 2, 3)),
  ])
  expect(decodeGltfJpeg(candidate)).toEqual(expected)
  expect(decodeGltfJpeg(joinJpegBytes([candidate, Uint8Array.of(17, 255, 216, 255)]))).toEqual(
    expected,
  )
})

test('dimensions, precision, components and sampling are checked before entropy allocation', async () => {
  const bytes = await solid()
  for (const [field, value, reason] of [
    [0, 12, 'unsupported'],
    [1, 0, 'invalid'],
    [6 + 1, 0, 'invalid'],
    [6 + 1, 0x51, 'invalid'],
    [6 + 2, 4, 'invalid'],
    [9, 1, 'invalid'],
  ] as const)
    fails(
      () =>
        decodeGltfJpeg(
          editJpegSegment(bytes, 0xc0, (data) => {
            data[field] = value
            if (field === 1) data[2] = 0
            return data
          }),
        ),
      reason,
    )
  for (const dimension of [1025, 65535])
    for (const field of [1, 3])
      fails(
        () =>
          decodeGltfJpeg(
            editJpegSegment(bytes, 0xc0, (data) => {
              data[field] = dimension >> 8
              data[field + 1] = dimension & 255
              return data
            }),
          ),
        'budget',
      )
  for (const mode of [0xc3, 0xc5, 0xc6, 0xc9, 0xca])
    fails(() => decodeGltfJpeg(editJpegSegment(bytes, 0xc0, (data) => data, mode)), 'unsupported')
  const cmyk = await sharp(bytes).toColourspace('cmyk').jpeg().toBuffer()
  fails(() => decodeGltfJpeg(cmyk), 'unsupported')
  fails(() => decodeGltfJpeg(new Uint8Array(new SharedArrayBuffer(bytes.length))), 'unsupported')
  fails(() => decodeGltfJpeg(new Uint8Array(GLTF_INPUT_LIMITS.fileBytes + 1)), 'budget')
})

test('framing and tables reject truncated data instead of reading through another segment', async () => {
  const bytes = await solid()
  for (const length of [0, 1, 2, 10, bytes.length - 1, bytes.length - 2, bytes.length - 6])
    fails(() => decodeGltfJpeg(bytes.subarray(0, length)))
  for (const code of [0xdb, 0xc4])
    for (const count of [0, 1, 16, 30])
      fails(() =>
        decodeGltfJpeg(
          editJpegSegment(bytes, code, (data) =>
            data.subarray(0, Math.min(count, data.length - 1)),
          ),
        ),
      )
  fails(() =>
    decodeGltfJpeg(
      editJpegSegment(bytes, 0xdb, (data) => {
        data[1] = 0
        return data
      }),
    ),
  )
  fails(() =>
    decodeGltfJpeg(
      editJpegSegment(bytes, 0xc4, (data) => {
        data[1] = 2
        return data
      }),
    ),
  )
  fails(() =>
    decodeGltfJpeg(
      editJpegSegment(bytes, 0xc4, (data) => {
        data[17] = 12
        return data
      }),
    ),
  )
  const frame = jpegHeader(bytes).find((part) => part.code === 0xc0)!
  fails(() => decodeGltfJpeg(prependJpegSegments(bytes, [bytes.subarray(frame.start, frame.end)])))
  fails(() => decodeGltfJpeg(prependJpegSegments(bytes, [Uint8Array.of(255, 0xd0)])))
  fails(() => decodeGltfJpeg(prependJpegSegments(bytes, [Uint8Array.of(255, 0)])))
  fails(() => decodeGltfJpeg(prependJpegSegments(bytes, [jpegSegment(0xdd, Uint8Array.of(1))])))
  const scan = jpegHeader(bytes).find((part) => part.code === 0xda)!
  fails(() => decodeGltfJpeg(joinJpegBytes([bytes.subarray(0, scan.end), Uint8Array.of(255, 217)])))
})

test('scan selectors, progressive parameters and total scan work have explicit bounds', async () => {
  const bytes = await solid()
  for (const [index, value] of [
    [0, 0],
    [1, 99],
    [3, 1],
    [2, 0x40],
    [7, 1],
    [8, 64],
    [9, 1],
  ])
    fails(() =>
      planGltfJpeg(
        editJpegSegment(bytes, 0xda, (data) => {
          data[index!] = value!
          return data
        }),
      ),
    )
  const frame = jpegSegment(0xc2, Uint8Array.of(8, 0, 1, 0, 1, 1, 1, 0x11, 0)),
    scan = jpegSegment(0xda, Uint8Array.of(1, 1, 0, 0, 0, 0)),
    build = (f: Uint8Array, count: number) =>
      joinJpegBytes([
        Uint8Array.of(255, 216),
        f,
        ...Array.from({ length: count }, () => scan),
        Uint8Array.of(255, 217),
      ])
  expect(planGltfJpeg(build(frame, 64)).width).toBe(1)
  fails(() => planGltfJpeg(build(frame, 65)), 'budget')
  const bigFrame = jpegSegment(
      0xc2,
      Uint8Array.of(8, 4, 0, 4, 0, 3, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0),
    ),
    allScan = jpegSegment(0xda, Uint8Array.of(3, 1, 0, 2, 0, 3, 0, 0, 0, 0))
  fails(
    () =>
      planGltfJpeg(
        joinJpegBytes([
          Uint8Array.of(255, 216),
          bigFrame,
          ...Array.from({ length: 22 }, () => allScan),
          Uint8Array.of(255, 217),
        ]),
      ),
    'budget',
  )
})

test('exact maximum-size JPEG decodes within the configured codec limits', async () => {
  const bytes = await solid(true, 1024, 1024)
  const result = decodeGltfJpeg(bytes)
  expect(result.rgba.byteLength).toBe(4 * 1024 * 1024)
  expect(Array.from(result.rgba.subarray(0, 4))).toEqual(Array.from(result.rgba.subarray(-4)))
})

test('segment and codec allocation caps fail explicitly, and a later import has a fresh budget', async () => {
  const bytes = await solid(),
    header = jpegHeader(bytes),
    ordinaryMarkers = header.length + 1, // EOI, not SOI
    comment = jpegSegment(0xfe, new Uint8Array(0)),
    comments = Array.from(
      { length: GLTF_INPUT_LIMITS.imageChunks - ordinaryMarkers },
      () => comment,
    )
  expect(planGltfJpeg(prependJpegSegments(bytes, comments)).width).toBe(17)
  fails(() => planGltfJpeg(prependJpegSegments(bytes, [...comments, comment])), 'budget')
  const table = header.find((part) => part.code === 0xdb)!
  const tables = jpegSegment(0xdb, joinJpegBytes(Array.from({ length: 1000 }, () => table.data)))
  const costly = prependJpegSegments(
    bytes,
    Array.from({ length: 263 }, () => tables),
  )
  expect(costly.byteLength).toBeLessThan(GLTF_INPUT_LIMITS.fileBytes)
  expect(planGltfJpeg(costly).width).toBe(17)
  const error = fails(() => decodeGltfJpeg(costly), 'budget')
  expect(error.cause).toBeInstanceOf(Error)
  expect(decodeGltfJpeg(bytes).rgba.length).toBe(17 * 11 * 4)
})
