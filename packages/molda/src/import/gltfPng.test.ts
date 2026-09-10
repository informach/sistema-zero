import { expect, test } from 'bun:test'
import { gzipSync, zlibSync } from 'fflate'
import sharp from 'sharp'
import { encodePng } from '../export/png'
import { encodeSceneGlb } from '../export/sceneGlb'
import { makePngFixture, pngChunk, pngParts } from '../testing/pngFixture'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { readGltfEnvelope } from './gltfEnvelope'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'
import { decodeGltfPng } from './gltfPng'
import { inflateGltfPng } from './gltfPngInflate'
import { planGltfPng } from './gltfPngPlan'
import { readGltfResources } from './gltfResources'

const MODES = [
  [0, 1],
  [0, 2],
  [0, 4],
  [0, 8],
  [0, 16],
  [2, 8],
  [2, 16],
  [3, 1],
  [3, 2],
  [3, 4],
  [3, 8],
  [4, 8],
  [4, 16],
  [6, 8],
  [6, 16],
] as const
const end = () => pngChunk('IEND', new Uint8Array(0))
function fails(run: () => unknown, reason: GltfInputError['reason'] = 'invalid') {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  if (!(error instanceof GltfInputError)) throw new Error('Expected a structured PNG error')
  expect(error.reason).toBe(reason)
  expect(error.path).toBe('image')
}

test('IDAT fragmentation is arbitrary, including empty chunks and a split zlib header/checksum', () => {
  const fixture = makePngFixture({
    width: 7,
    height: 9,
    colorType: 6,
    depth: 16,
    interlaced: true,
    filter: 4,
  })
  for (const size of [1, 2, 3, 7, 16, 127]) {
    const fragments: Uint8Array[] = []
    for (let i = 0; i < fixture.compressed.length; i += size) {
      fragments.push(pngChunk('IDAT', new Uint8Array(0)))
      fragments.push(pngChunk('IDAT', fixture.compressed.subarray(i, i + size)))
    }
    const bytes = pngParts([...fixture.before, ...fragments, end()])
    expect(Array.from(decodeGltfPng(bytes).rgba)).toEqual(fixture.rgba)
  }
  // Arbitrary unused trailing bytes are not a second zlib member in PNG.
  const trailing = new Uint8Array(fixture.compressed.length + 30)
  trailing.set(fixture.compressed)
  trailing.fill(199, fixture.compressed.length)
  for (const chunks of [
    [pngChunk('IDAT', trailing)],
    [pngChunk('IDAT', fixture.compressed), pngChunk('IDAT', new Uint8Array([120, 156, 7]))],
  ])
    expect(Array.from(decodeGltfPng(pngParts([...fixture.before, ...chunks, end()])).rgba)).toEqual(
      fixture.rgba,
    )
})

test('PNG corruption and malformed critical structure fail without partial pixels', () => {
  const fixture = makePngFixture({ width: 2, height: 2, colorType: 6, depth: 8 })
  for (const length of [0, 1, 8, 20, 32, fixture.bytes.length - 1])
    fails(() => decodeGltfPng(fixture.bytes.subarray(0, length)))
  const badCrc = new Uint8Array(fixture.bytes)
  badCrc[29] = badCrc[29]! ^ 1
  fails(() => decodeGltfPng(badCrc))
  const data = pngChunk('IDAT', fixture.compressed),
    header = fixture.before[0]!
  for (const parts of [
    [header, header, data, end()],
    [header, end()],
    [header, data],
    [header, data, pngChunk('tEXt', new Uint8Array(0)), data, end()],
    [header, data, end(), end()],
    [header, data, pngChunk('IEND', new Uint8Array([1]))],
    [header, pngChunk('a1bc', new Uint8Array(0)), data, end()],
  ])
    fails(() => decodeGltfPng(pngParts(parts)))
  fails(
    () => decodeGltfPng(pngParts([header, pngChunk('ABCD', new Uint8Array(0)), data, end()])),
    'unsupported',
  )
  for (const [offset, value] of [
    [8, 3],
    [9, 1],
    [8, 4],
  ] as const) {
    const changed = new Uint8Array(fixture.header)
    changed[offset] = value
    fails(() => decodeGltfPng(pngParts([pngChunk('IHDR', changed), data, end()])))
  }
  for (const offset of [10, 11, 12]) {
    const changed = new Uint8Array(fixture.header)
    changed[offset] = 7
    fails(() => decodeGltfPng(pngParts([pngChunk('IHDR', changed), data, end()])), 'unsupported')
  }
  const invalidFilter = makePngFixture({ width: 1, height: 1, colorType: 6, depth: 8, filter: 5 })
  fails(() => decodeGltfPng(invalidFilter.bytes))
})

test('palettes and transparency obey color type, order, size and referenced-index requirements', () => {
  const indexed = makePngFixture({ width: 1, height: 1, colorType: 3, depth: 2, samples: [3] })
  const header = indexed.before[0]!,
    palette = indexed.before[1]!,
    data = pngChunk('IDAT', indexed.compressed)
  for (const parts of [
    [header, data, end()],
    [header, palette, palette, data, end()],
    [header, pngChunk('PLTE', new Uint8Array(0)), data, end()],
    [header, pngChunk('PLTE', new Uint8Array(4)), data, end()],
    [header, pngChunk('PLTE', new Uint8Array(15)), data, end()],
    [header, pngChunk('PLTE', new Uint8Array(3)), data, end()],
    [header, pngChunk('tRNS', new Uint8Array([0])), palette, data, end()],
    [header, palette, pngChunk('tRNS', new Uint8Array(5)), data, end()],
    [header, palette, data, pngChunk('tRNS', new Uint8Array(1)), end()],
    [
      header,
      palette,
      pngChunk('tRNS', new Uint8Array(0)),
      pngChunk('tRNS', new Uint8Array(0)),
      data,
      end(),
    ],
  ])
    fails(() => decodeGltfPng(pngParts(parts)))
  for (const colorType of [0, 2, 4, 6] as const) {
    const fixture = makePngFixture({ width: 1, height: 1, colorType, depth: 8 })
    fails(() =>
      decodeGltfPng(
        pngParts([
          ...fixture.before,
          pngChunk('tRNS', new Uint8Array(3)),
          pngChunk('IDAT', fixture.compressed),
          end(),
        ]),
      ),
    )
    if (colorType === 0 || colorType === 4)
      fails(() =>
        decodeGltfPng(
          pngParts([...fixture.before, palette, pngChunk('IDAT', fixture.compressed), end()]),
        ),
      )
  }
})

test('zlib checksum, truncation, wrong wrapper and expanded length are checked with fixed output blocks', () => {
  const fixture = makePngFixture({ width: 1, height: 1, colorType: 6, depth: 8 })
  const badAdler = new Uint8Array(fixture.compressed)
  badAdler[badAdler.length - 1] = badAdler.at(-1)! ^ 1
  for (const compressed of [
    badAdler,
    fixture.compressed.subarray(0, -1),
    fixture.compressed.subarray(0, 3),
    gzipSync(fixture.raw),
    zlibSync(new Uint8Array(4)),
    zlibSync(new Uint8Array(6)),
  ])
    fails(() => decodeGltfPng(pngParts([...fixture.before, pngChunk('IDAT', compressed), end()])))
  const bomb = zlibSync(new Uint8Array(4 * 1024 * 1024))
  const chunks = [bomb]
  Object.defineProperty(chunks, 1, {
    get() {
      throw new Error('Decoder continued after excessive expansion')
    },
  })
  fails(() => inflateGltfPng(chunks, 5, 'image'))
  fails(() => decodeGltfPng(pngParts([...fixture.before, pngChunk('IDAT', bomb), end()])))
})

test('input, dimensions and metadata limits precede pixel allocation, including exact maximum texture size', () => {
  fails(() => decodeGltfPng(new Uint8Array(GLTF_INPUT_LIMITS.fileBytes + 1)), 'budget')
  const fixture = makePngFixture({ width: 1, height: 1, colorType: 6, depth: 16 })
  for (const width of [0, 1025, 0xffffffff]) {
    const header = new Uint8Array(fixture.header)
    new DataView(header.buffer).setUint32(0, width)
    fails(
      () =>
        decodeGltfPng(
          pngParts([pngChunk('IHDR', header), pngChunk('IDAT', new Uint8Array(0)), end()]),
        ),
      width === 1025 ? 'budget' : 'invalid',
    )
  }
  const chunks = Array.from({ length: GLTF_INPUT_LIMITS.imageChunks - 3 }, () =>
    pngChunk('aBCd', new Uint8Array(0)),
  )
  const exact = pngParts([
    ...fixture.before,
    ...chunks,
    pngChunk('IDAT', fixture.compressed),
    end(),
  ])
  expect(Array.from(decodeGltfPng(exact).rgba)).toEqual(fixture.rgba)
  fails(
    () =>
      decodeGltfPng(
        pngParts([
          ...fixture.before,
          ...chunks,
          pngChunk('aBCd', new Uint8Array(0)),
          pngChunk('IDAT', fixture.compressed),
          end(),
        ]),
      ),
    'budget',
  )
  const header = new Uint8Array(fixture.header),
    view = new DataView(header.buffer)
  view.setUint32(0, 1024)
  view.setUint32(4, 1024)
  const compressed = zlibSync(new Uint8Array((1024 * 8 + 1) * 1024))
  const large = decodeGltfPng(
    pngParts([pngChunk('IHDR', header), pngChunk('IDAT', compressed), end()]),
  )
  expect(large.rgba.byteLength).toBe(1024 * 1024 * 8)
  expect(large.rgba.every((value) => value === 0)).toBe(true)
})

test('all 15 PNG color/depth modes preserve exact samples through five filters and both interlace layouts', async () => {
  for (const [colorType, depth] of MODES) {
    for (const interlaced of [false, true]) {
      for (let filter = 0; filter <= 4; filter++) {
        const fixture = makePngFixture({
          width: 17,
          height: 11,
          colorType,
          depth,
          interlaced,
          filter,
        })
        const before = new Uint8Array(fixture.bytes)
        const result = decodeGltfPng(fixture.bytes)
        expect(result).toMatchObject({ width: 17, height: 11, depth: depth === 16 ? 16 : 8 })
        expect(Array.from(result.rgba)).toEqual(fixture.rgba)
        expect(fixture.bytes).toEqual(before)
        const oracle = await sharp(fixture.bytes)
          .toColourspace(depth === 16 ? 'rgb16' : 'srgb')
          .ensureAlpha()
          .raw({ depth: depth === 16 ? 'ushort' : 'uchar' })
          .toBuffer({ resolveWithObject: true })
        expect(oracle.info.channels).toBe(4)
        const values =
          depth === 16
            ? new Uint16Array(
                oracle.data.buffer,
                oracle.data.byteOffset,
                oracle.data.byteLength / 2,
              )
            : oracle.data
        expect(Array.from(result.rgba)).toEqual(Array.from(values))
      }
    }
  }
})

test('Adam7 empty passes and packed-row padding work at every small rectangular size', () => {
  for (const [colorType, depth] of MODES) {
    for (let width = 1; width <= 9; width++) {
      for (let height = 1; height <= 9; height++) {
        const fixture = makePngFixture({
          width,
          height,
          colorType,
          depth,
          interlaced: true,
          filter: (width + height) % 5,
        })
        const plan = planGltfPng(fixture.bytes)
        expect(plan.byteLength).toBe(fixture.raw.length)
        expect(Array.from(decodeGltfPng(fixture.bytes).rgba)).toEqual(fixture.rgba)
      }
    }
  }
})

test('palette alpha and transparent RGB/gray compare exact samples before any depth conversion', () => {
  const cases: Parameters<typeof makePngFixture>[0][] = [
    {
      width: 4,
      height: 1,
      colorType: 3,
      depth: 2,
      samples: [0, 1, 2, 3],
      transparency: new Uint8Array([0, 1, 128]),
    },
    {
      width: 1,
      height: 1,
      colorType: 2,
      depth: 8,
      samples: [1, 2, 3],
      transparency: new Uint8Array([0, 1, 0, 2, 0, 3]),
    },
    {
      width: 2,
      height: 1,
      colorType: 2,
      depth: 16,
      samples: [0x1200, 0x2300, 0x3400, 0x1201, 0x2300, 0x3400],
      transparency: new Uint8Array([0x12, 0, 0x23, 0, 0x34, 0]),
    },
    {
      width: 2,
      height: 1,
      colorType: 0,
      depth: 16,
      samples: [0xabcd, 0xabce],
      transparency: new Uint8Array([0xab, 0xcd]),
    },
    // PNG 3: unused high bits of a tRNS sample are masked by the decoder.
    {
      width: 2,
      height: 1,
      colorType: 0,
      depth: 4,
      samples: [15, 14],
      transparency: new Uint8Array([255, 255]),
    },
  ]
  for (const options of cases) {
    const fixture = makePngFixture(options)
    const result = decodeGltfPng(fixture.bytes)
    expect(Array.from(result.rgba)).toEqual(fixture.rgba)
    expect(result.rgba[3]).toBe(0)
  }
  const rgba = new Uint8Array([255, 7, 129, 0, 89, 73, 17, 1, 5, 9, 13, 128, 255, 255, 255, 255])
  expect(decodeGltfPng(encodePng(rgba, 2, 2)).rgba).toEqual(rgba)
})

test('libvips-encoded adaptive/interlaced/paletted PNGs decode like libvips without row flips', async () => {
  const rgba = Uint8Array.from(
    { length: 19 * 13 * 4 },
    (_, i) => ((Math.floor(i / 4) % 16) * 37 + (i % 4) * 61) % 256,
  )
  for (const progressive of [false, true]) {
    for (const palette of [false, true]) {
      const png = await sharp(rgba, { raw: { width: 19, height: 13, channels: 4 } })
        .png({ progressive, palette, colours: 16, adaptiveFiltering: true })
        .toBuffer()
      const result = decodeGltfPng(png)
      const oracle = await sharp(png).ensureAlpha().raw().toBuffer()
      expect(Array.from(result.rgba)).toEqual(Array.from(oracle))
    }
  }
})

test('color/text/EXIF/physical/APNG metadata stays inert and the default image retains its raw pixels', () => {
  const fixture = makePngFixture({ width: 3, height: 2, colorType: 6, depth: 8 })
  const ancillary = [
    'iCCP',
    'gAMA',
    'sRGB',
    'cHRM',
    'cICP',
    'tEXt',
    'zTXt',
    'iTXt',
    'eXIf',
    'pHYs',
    'acTL',
    'fcTL',
    'fdAT',
    'abcz',
  ]
  const bytes = pngParts([
    ...fixture.before,
    ...ancillary.map((name) => pngChunk(name, new Uint8Array([255, 255, 255, 255]))),
    pngChunk('IDAT', fixture.compressed),
    end(),
  ])
  expect(Array.from(decodeGltfPng(bytes).rgba)).toEqual(fixture.rgba)
  const source = readGltfEnvelope(
    encodeSceneGlb(makeSceneGlbFixture(2, 2, 3, 2), { allowLosses: true }).bytes,
  )
  const resources = readGltfResources(source)
  if (resources.status !== 'ready') throw new Error('GLB fixture must own its images')
  for (const image of resources.images) {
    const decoded = decodeGltfPng(image.bytes)
    expect(decoded).toMatchObject({ width: 2, height: 2, depth: 8 })
    if (decoded.depth !== 8) throw new Error('Export fixture is 8-bit PNG')
    expect(encodePng(decoded.rgba, 2, 2)).toEqual(image.bytes)
  }
})
