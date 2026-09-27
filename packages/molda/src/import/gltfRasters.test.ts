import { expect, test } from 'bun:test'
import { zlibSync } from 'fflate'
import sharp from 'sharp'
import { bytesToBase64 } from '../core/skinCodec'
import { encodeGlbContainer } from '../export/glbContainer'
import { encodePng } from '../export/png'
import { encodeSceneGlb } from '../export/sceneGlb'
import { SCENE_LIMITS } from '../scene/limits'
import { expectValidGlb } from '../testing/gltfValidation'
import { makePngFixture, pngChunk, pngParts } from '../testing/pngFixture'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { readGltfEnvelope } from './gltfEnvelope'
import { GltfInputError } from './gltfInput'
import { decodeGltfJpeg } from './gltfJpeg'
import { decodeGltfRasters } from './gltfRasters'
import { type GltfImageResource, readGltfResources } from './gltfResources'

const image = (bytes: Uint8Array, mimeType: string | null = null): GltfImageResource => ({
  bytes,
  name: null,
  mimeType,
  uriMimeType: null,
})
const tiny = () => encodePng(Uint8Array.of(13, 72, 129, 0), 1, 1)

function fails(run: () => unknown, reason: GltfInputError['reason'], path: string) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  if (!(error instanceof GltfInputError)) throw new Error('Expected a structured raster error')
  expect(error.reason).toBe(reason)
  expect(error.path).toBe(path)
}

function large16(valid = true) {
  const header = new Uint8Array(13),
    view = new DataView(header.buffer)
  view.setUint32(0, 1024)
  view.setUint32(4, 1024)
  header[8] = 16
  header[9] = 6
  const compressed = valid ? zlibSync(new Uint8Array(1024 * (1024 * 8 + 1))) : Uint8Array.of(0)
  return pngParts([
    pngChunk('IHDR', header),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', new Uint8Array(0)),
  ])
}

test('selected images map to unique owned rasters, including identical view intervals', () => {
  const png = tiny(),
    stored = new Uint8Array(png.length * 2 + 15)
  stored.set(png, 7)
  stored.set(png, 7 + png.length)
  const resources = [
    image(stored.subarray(7, 7 + png.length)),
    image(new Uint8Array(stored.buffer, 7, png.length), 'image/png'),
    image(stored.subarray(7 + png.length, 7 + png.length * 2)),
    image(new Uint8Array(png)),
  ]
  const original = new Uint8Array(stored),
    result = decodeGltfRasters(resources, [1, 0, 1, 2, 3])
  expect([...result.images]).toEqual([
    [1, 0],
    [0, 0],
    [2, 1],
    [3, 2],
  ])
  expect(result.rasters.length).toBe(3)
  expect(result.pixelBytes).toBe(12)
  for (const raster of result.rasters) {
    expect(Array.from(raster.rgba)).toEqual([13, 72, 129, 0])
    expect(raster.rgba.buffer).not.toBe(stored.buffer)
  }
  expect(stored).toEqual(original)
  result.rasters[0]!.rgba[0] = 99
  expect(result.rasters[1]!.rgba[0]).toBe(13)
  expect(decodeGltfRasters(resources, [0]).rasters[0]!.rgba[0]).toBe(13)
})

test('MIME declarations are checked for every selected image, including aliases', () => {
  const png = tiny()
  for (const declared of ['image/jpeg', 'image/webp', 'IMAGE/PNG', 'image/png;charset=utf8']) {
    fails(() => decodeGltfRasters([image(png, declared)], [0]), 'invalid', 'images[0]')
    fails(
      () => decodeGltfRasters([image(png), { ...image(png), uriMimeType: declared }], [0, 1]),
      'invalid',
      'images[1]',
    )
  }
  expect(
    decodeGltfRasters([{ ...image(png, 'image/png'), uriMimeType: 'image/png' }], [0]).pixelBytes,
  ).toBe(4)
  fails(() => decodeGltfRasters([image(Uint8Array.of(1, 2, 3))], [0]), 'unsupported', 'images[0]')
  fails(() => decodeGltfRasters([image(png.subarray(0, 8))], [0]), 'invalid', 'images[0]')
  const shared = new Uint8Array(new SharedArrayBuffer(png.length))
  shared.set(png)
  fails(() => decodeGltfRasters([image(shared)], [0]), 'unsupported', 'images[0]')
})

test('unselected resources remain unopened and selection errors cannot silently omit an image', () => {
  const resources: GltfImageResource[] = [
    image(tiny()),
    {
      ...image(new Uint8Array(0)),
      get bytes(): Uint8Array {
        throw new Error('Unselected source opened')
      },
    },
  ]
  expect(decodeGltfRasters(resources, []).rasters).toEqual([])
  expect(decodeGltfRasters(resources, [0]).pixelBytes).toBe(4)
  for (const index of [-1, 2, NaN, Infinity, 0.5])
    fails(() => decodeGltfRasters(resources, [index]), 'invalid', 'images.selection')
  fails(() => decodeGltfRasters(resources, new Array<number>(1)), 'invalid', 'images.selection')
  fails(
    () =>
      decodeGltfRasters(
        resources,
        Array.from({ length: SCENE_LIMITS.images + 1 }, () => 0),
      ),
    'budget',
    'images',
  )
  // Exact aliasing, not content hashing; avoid even parsing a PNG per descriptor.
  const bytes = tiny(),
    many = Array.from({ length: SCENE_LIMITS.images }, () => image(bytes))
  const result = decodeGltfRasters(
    many,
    many.map((_, i) => i),
  )
  expect(result.images.size).toBe(SCENE_LIMITS.images)
  expect(result.rasters.length).toBe(1)
})

test('all unique decoded byte budgets are checked before the first decompression', () => {
  const invalidPixels = large16(false)
  // Valid layout/CRC, invalid compressed pixels. Budget must win over the first
  // image's decoder error without injecting or mocking a decoder callback.
  const resources = Array.from({ length: 4 }, () => image(new Uint8Array(invalidPixels)))
  resources.push(image(tiny()))
  fails(() => decodeGltfRasters(resources, [0, 1, 2, 3, 4]), 'budget', 'images[4]')
  fails(() => decodeGltfRasters(resources, [0]), 'invalid', 'images[0]')
})

test('the exact 32 MiB boundary retains PNG16 precision and repeated sources count once', () => {
  const png = large16(),
    resources = Array.from({ length: 4 }, () => image(new Uint8Array(png)))
  resources.push(image(resources[0]!.bytes))
  const result = decodeGltfRasters(resources, [0, 1, 2, 3, 4])
  expect(result.pixelBytes).toBe(SCENE_LIMITS.pixelBytes)
  expect(result.rasters.length).toBe(4)
  expect(result.images.get(4)).toBe(0)
  for (const raster of result.rasters) {
    expect(raster.depth).toBe(16)
    expect(raster.rgba).toBeInstanceOf(Uint16Array)
    expect(raster.rgba.byteLength).toBe(8 * 1024 * 1024)
    expect(raster.rgba.every((value) => value === 0)).toBe(true)
  }
  const fixture = makePngFixture({ width: 2, height: 3, depth: 16, colorType: 6 })
  expect(Array.from(decodeGltfRasters([image(fixture.bytes)], [0]).rasters[0]!.rgba)).toEqual(
    fixture.rgba,
  )
})

test('JPEG and PNG share the selected-resource pipeline without orientation or precision conversion', async () => {
  const jpeg = await sharp({ create: { width: 13, height: 7, channels: 3, background: '#bf4275' } })
      .jpeg({ progressive: true })
      .toBuffer(),
    png = tiny()
  const envelope = readGltfEnvelope(
    new TextEncoder().encode(
      JSON.stringify({
        asset: { version: '2.0' },
        images: [
          { uri: `data:image/jpeg;base64,${bytesToBase64(jpeg)}` },
          { uri: 'color.png' },
          { uri: './color.png', mimeType: 'image/png' },
        ],
      }),
    ),
  )
  const resources = readGltfResources(envelope, [{ path: 'color.png', bytes: png }])
  if (resources.status !== 'ready') throw new Error('Fixture is self-contained')
  const original = resources.images.map((source) => new Uint8Array(source.bytes)),
    result = decodeGltfRasters(resources.images, [0, 1, 2])
  expect(result.rasters.length).toBe(2)
  expect(result.pixelBytes).toBe(13 * 7 * 4 + 4)
  expect(result.rasters[0]).toEqual(decodeGltfJpeg(jpeg))
  for (let i = 0; i < original.length; i++) expect(resources.images[i]!.bytes).toEqual(original[i]!)
  const glb = encodeGlbContainer(
    {
      asset: { version: '2.0' },
      buffers: [{ byteLength: jpeg.length }],
      bufferViews: [{ buffer: 0, byteLength: jpeg.length }],
      images: [{ bufferView: 0, mimeType: 'image/jpeg' }],
    },
    [jpeg],
  )
  await expectValidGlb(glb)
  const embedded = readGltfResources(readGltfEnvelope(glb))
  if (embedded.status !== 'ready') throw new Error('Fixture is self-contained')
  expect(decodeGltfRasters(embedded.images, [0]).rasters[0]).toEqual(result.rasters[0]!)
})

test('native textured GLB goes through resource, MIME, pixel planning and decode byte-for-byte', async () => {
  const fixture = makeSceneGlbFixture(1, 2, 3, 8),
    glb = encodeSceneGlb(fixture, { allowLosses: true }).bytes
  await expectValidGlb(glb)
  const resources = readGltfResources(readGltfEnvelope(glb))
  if (resources.status !== 'ready') throw new Error('Fixture is self-contained')
  const result = decodeGltfRasters(
    resources.images,
    resources.images.map((_, i) => i),
  )
  expect(result.rasters.length).toBeGreaterThan(0)
  for (const [index, rasterIndex] of result.images) {
    const raster = result.rasters[rasterIndex]!
    if (raster.depth !== 8) throw new Error('Native fixture is PNG8')
    expect(encodePng(raster.rgba, raster.width, raster.height)).toEqual(
      resources.images[index]!.bytes,
    )
  }
})
