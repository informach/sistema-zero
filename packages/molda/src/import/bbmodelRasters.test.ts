import { expect, test } from 'bun:test'
import { zlibSync } from 'fflate'
import sharp from 'sharp'
import { encodePng } from '../export/png'
import { SCENE_LIMITS } from '../scene/limits'
import { makePngFixture, pngChunk, pngParts } from '../testing/pngFixture'
import { readBbmodelAppearance } from './bbmodelAppearance'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { BbmodelInputError } from './bbmodelInput'
import { decodeBbmodelRasters } from './bbmodelRasters'
import { type BbmodelLocalFile, readBbmodelResources } from './bbmodelResources'
import { decodeGltfRasters } from './gltfRasters'
import { RasterInputError } from './rasterInput'

function dataUri(bytes: Uint8Array, mime = 'image/png') {
  return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`
}
function ready(
  textures: Record<string, unknown>[],
  options: { files?: BbmodelLocalFile[]; indices?: number[]; version?: BbmodelVersion } = {},
) {
  const version = options.version ?? '5.0'
  const bytes = new TextEncoder().encode(
    JSON.stringify({ meta: { format_version: version, model_format: 'free' }, textures }),
  )
  const result = readBbmodelResources({
    bytes,
    entryPath: 'model.bbmodel',
    version,
    appearance: readBbmodelAppearance(readBbmodelEnvelope(bytes)),
    textureIndices: options.indices ?? textures.map((_, i) => i),
    files: options.files ?? [],
    sourcePreference: 'prefer-embedded',
  })
  if (result.status !== 'ready') throw new Error(`Missing fixture: ${result.paths.join(', ')}`)
  return result
}
function filesReady(images: Uint8Array[]) {
  return ready(
    images.map((_, i) => ({ uuid: `t${i}`, relative_path: `image_${i}.bin` })),
    {
      files: images.map((bytes, i) => ({ path: `image_${i}.bin`, bytes })),
    },
  )
}
function failure(run: () => unknown, reason: BbmodelInputError['reason'], path: string) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(BbmodelInputError)
  expect((error as BbmodelInputError).reason).toBe(reason)
  expect((error as BbmodelInputError).path).toBe(path)
  expect((error as Error).cause).toBeInstanceOf(RasterInputError)
}
function large16(valid: boolean, width = 1024) {
  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, width)
  view.setUint32(4, 1024)
  header[8] = 16
  header[9] = 6
  return pngParts([
    pngChunk('IHDR', header),
    pngChunk('IDAT', valid ? zlibSync(new Uint8Array(1024 * (width * 8 + 1))) : Uint8Array.of(0)),
    pngChunk('IEND', new Uint8Array(0)),
  ])
}

test('bbmodel resource pipeline decodes selected images once per resource in all versions, preserving transparent RGB and row order', () => {
  const rgba = Uint8Array.of(13, 72, 129, 0, 20, 30, 40, 128, 255, 0, 3, 255, 4, 250, 8, 1)
  const png = encodePng(rgba, 2, 2)
  for (const version of ['4.9', '4.10', '5.0'] as const) {
    const source = ready(
      [
        {
          uuid: 'first',
          source: dataUri(png),
          width: 999999,
          height: 0,
          uv_width: 0.5,
          uv_height: 17.5,
          layers_enabled: true,
          layers: [{ source: 'javascript:never()' }],
          frame_time: -1,
        },
        { uuid: 'shared', source: dataUri(png) },
        { uuid: 'unused', source: dataUri(Uint8Array.of(0)) },
        { uuid: 'local', relative_path: version === '4.9' ? '../image.bin' : 'image.bin' },
      ],
      { version, indices: [1, 3, 0, 1], files: [{ path: 'image.bin', bytes: png }] },
    )
    const before = structuredClone(source)
    const decoded = decodeBbmodelRasters(source)
    expect([...decoded.textures]).toEqual([
      [1, 0],
      [3, 1],
      [0, 0],
    ])
    expect(decoded.pixelBytes).toBe(32)
    expect(decoded.rasters.length).toBe(2)
    for (const raster of decoded.rasters) {
      expect(raster).toEqual({ width: 2, height: 2, depth: 8, rgba })
      expect(raster.rgba.buffer === source.resources[0]!.bytes.buffer).toBe(false)
    }
    decoded.rasters[0]!.rgba[0] = 88
    expect(decoded.rasters[1]!.rgba[0]).toBe(13)
    expect(source).toEqual(before)
    expect(decodeBbmodelRasters(source).rasters[0]!.rgba[0]).toBe(13)
  }
})

test('bbmodel keeps 16-bit Adam7 samples exact and dispatches JPEG by actual signature, not filename or cached sizes', async () => {
  const png = makePngFixture({
    width: 5,
    height: 3,
    colorType: 6,
    depth: 16,
    interlaced: true,
    filter: 4,
  })
  const jpeg = new Uint8Array(
    await sharp({
      create: { width: 17, height: 9, channels: 3, background: { r: 80, g: 160, b: 240 } },
    })
      .jpeg({ quality: 100, progressive: true })
      .toBuffer(),
  )
  const source = ready(
    [
      { uuid: 'png', source: dataUri(png.bytes) },
      { uuid: 'jpg', relative_path: 'not-really-a-png.png', width: 1, height: 1 },
    ],
    { files: [{ path: 'not-really-a-png.png', bytes: jpeg }] },
  )
  const decoded = decodeBbmodelRasters(source)
  expect(decoded.rasters[0]!.depth).toBe(16)
  expect(decoded.rasters[0]!.rgba).toBeInstanceOf(Uint16Array)
  expect(Array.from(decoded.rasters[0]!.rgba)).toEqual(png.rgba)
  const regression = decodeGltfRasters(
    [{ bytes: jpeg, name: null, mimeType: null, uriMimeType: null }],
    [0],
  )
  expect(decoded.rasters[1]).toEqual(regression.rasters[0]!)
  const oracle = await sharp(jpeg).ensureAlpha().raw().toBuffer()
  for (let i = 0; i < oracle.length; i++)
    expect(Math.abs(decoded.rasters[1]!.rgba[i]! - oracle[i]!)).toBeLessThanOrEqual(2)
  expect(decoded.pixelBytes).toBe(5 * 3 * 8 + 17 * 9 * 4)
})

test('bbmodel checks declared embedded MIME against the header and reports source/file provenance with typed causes', () => {
  const png = encodePng(Uint8Array.of(1, 2, 3, 4), 1, 1)
  const mismatched = ready([{ uuid: 'mismatch', source: dataUri(png, 'image/jpeg') }])
  failure(() => decodeBbmodelRasters(mismatched), 'invalid', 'textures[0].source')
  const unknown = ready(
    [
      { uuid: 'unused', source: dataUri(png) },
      { uuid: 'unknown', source: dataUri(Uint8Array.of(0)) },
    ],
    { indices: [1] },
  )
  failure(() => decodeBbmodelRasters(unknown), 'unsupported', 'textures[1].source')
  const corrupted = new Uint8Array(png)
  corrupted[corrupted.length - 1] = corrupted[corrupted.length - 1]! ^ 1
  const source = ready([{ uuid: 'file', relative_path: 'quote"%20.png' }], {
    files: [{ path: 'quote"%20.png', bytes: corrupted }],
  })
  const before = structuredClone(source)
  failure(() => decodeBbmodelRasters(source), 'invalid', 'files["quote\\"%20.png"]')
  expect(source).toEqual(before)
  failure(
    () => decodeBbmodelRasters(filesReady([large16(false, 1025)])),
    'budget',
    'files["image_0.bin"]',
  )
})

test('bbmodel plans all headers and the aggregate pixel budget before any compressed image is decoded', () => {
  const broken = large16(false)
  const tiny = encodePng(Uint8Array.of(1, 2, 3, 4), 1, 1)
  failure(
    () => decodeBbmodelRasters(filesReady([broken, broken, broken, broken])),
    'invalid',
    'files["image_0.bin"]',
  )
  failure(
    () => decodeBbmodelRasters(filesReady([broken, broken, broken, broken, tiny])),
    'budget',
    'files["image_4.bin"]',
  )
  failure(
    () => decodeBbmodelRasters(filesReady([broken, Uint8Array.of(0)])),
    'unsupported',
    'files["image_1.bin"]',
  )
  const valid = large16(true)
  const exact = decodeBbmodelRasters(filesReady([valid, valid, valid, valid]))
  expect(exact.pixelBytes).toBe(SCENE_LIMITS.pixelBytes)
  expect(exact.rasters.length).toBe(4)
  for (const raster of exact.rasters) {
    expect(raster.depth).toBe(16)
    expect(raster.rgba.byteLength).toBe(8 * 1024 * 1024)
    expect(raster.rgba[0]).toBe(0)
    expect(raster.rgba[raster.rgba.length - 1]).toBe(0)
  }
})

test('bbmodel counts unique resources, not texture bindings, and empty selection produces no images', () => {
  const source = dataUri(encodePng(Uint8Array.of(1, 2, 3, 4), 1, 1))
  const textures = Array.from({ length: SCENE_LIMITS.images + 1 }, (_, i) => ({
    uuid: `t${i}`,
    source,
  }))
  const decoded = decodeBbmodelRasters(ready(textures))
  expect(decoded.textures.size).toBe(SCENE_LIMITS.images + 1)
  expect(new Set(decoded.textures.values())).toEqual(new Set([0]))
  expect(decoded.rasters.length).toBe(1)
  expect(decoded.pixelBytes).toBe(4)
  expect(
    decodeBbmodelRasters(
      ready([{ uuid: 'unused', source: 'javascript:never()' }], { indices: [] }),
    ),
  ).toEqual({ textures: new Map(), rasters: [], pixelBytes: 0 })
})

test('bbmodel propagates unrelated programming failures without turning them into recoverable image errors', () => {
  const bundle = ready([{ uuid: 't', source: dataUri(encodePng(Uint8Array.of(1, 2, 3, 4), 1, 1)) }])
  const sentinel = new Error('Unexpected resource access failure')
  Object.defineProperty(bundle, 'resources', {
    get() {
      throw sentinel
    },
  })
  let error: unknown
  try {
    decodeBbmodelRasters(bundle)
  } catch (caught) {
    error = caught
  }
  expect(error).toBe(sentinel)
})
