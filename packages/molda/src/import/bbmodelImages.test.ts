import { expect, test } from 'bun:test'
import { encodePng } from '../export/png'
import { sampleSceneFlipbook, sceneFlipbookTexel } from '../scene/imageFlipbook'
import { sceneRasterFromCanvas } from '../scene/imageImport'
import { SCENE_LIMITS } from '../scene/limits'
import { readSceneDocument, readSceneImage } from '../scene/readDocument'
import { makePngFixture } from '../testing/pngFixture'
import { readBbmodelAppearance } from './bbmodelAppearance'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import {
  type BbmodelImageOptions,
  convertBbmodelImages,
  readBbmodelImageOptions,
} from './bbmodelImages'
import { BbmodelInputError } from './bbmodelInput'
import { decodeBbmodelRasters } from './bbmodelRasters'
import { readBbmodelResources } from './bbmodelResources'
import { planBbmodelTextureLayouts } from './bbmodelTextureLayouts'
import { importDocumentBase } from './importDocumentBase'

const topDown = Uint8Array.of(
  13,
  72,
  129,
  0,
  20,
  30,
  40,
  128,
  255,
  0,
  3,
  255,
  4,
  250,
  8,
  1,
  71,
  32,
  67,
  2,
  23,
  199,
  167,
  3,
  7,
  6,
  5,
  127,
  111,
  222,
  123,
  254,
)
function fixture(
  textures: Record<string, unknown>[] = [{ name: 'Pintura' }],
  png = encodePng(topDown, 2, 4),
  version: BbmodelVersion = '5.0',
  selected = textures.map((_, i) => i),
) {
  const bytes = new TextEncoder().encode(
      JSON.stringify({
        meta: { format_version: version, model_format: 'free' },
        resolution: { width: 2, height: 2 },
        textures: textures.map((row, index) => ({
          uuid: `texture-${index}`,
          source: `data:image/png;base64,${Buffer.from(png).toString('base64')}`,
          ...row,
        })),
      }),
    ),
    appearance = readBbmodelAppearance(readBbmodelEnvelope(bytes)),
    resources = readBbmodelResources({
      bytes,
      entryPath: 'model.bbmodel',
      version,
      appearance,
      textureIndices: selected,
      files: [],
      sourcePreference: 'prefer-embedded',
    })
  if (resources.status !== 'ready') throw new Error('Embedded fixture expected')
  const decoded = decodeBbmodelRasters(resources),
    layouts = planBbmodelTextureLayouts(appearance, decoded, selected).textures
  return { appearance, decoded, layouts, bytes }
}
function convert(input: ReturnType<typeof fixture>, options: BbmodelImageOptions = {}) {
  return convertBbmodelImages(input.appearance, input.decoded, input.layouts, options)
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
}
function poison(target: object, key: string) {
  Object.defineProperty(target, key, {
    get() {
      throw new Error(`Unexpected read: ${key}`)
    },
  })
}

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s materializes independently editable aliases with exact RGBA and owned frame sequences', (version) => {
  const input = fixture(
      [
        { name: 'Folha', fps: 2, frame_order_type: 'custom', frame_order: '1 1 0' },
        { name: 'Estática', uv_width: 2, uv_height: 4 },
      ],
      undefined,
      version,
    ),
    before = structuredClone(input),
    result = convert(input),
    expected = sceneRasterFromCanvas(2, 4, new Uint8ClampedArray(topDown)).pixels
  expect(input.decoded.rasters).toHaveLength(1)
  expect(result.images).toHaveLength(2)
  expect(result.pixelBytes).toBe(64)
  expect([...result.byTexture]).toEqual([
    [0, 'bbmodel_image_0'],
    [1, 'bbmodel_image_1'],
  ])
  expect(result.issues).toEqual([])
  for (const image of result.images) {
    expect(image.layers[0]!.pixels).toEqual(expected)
    expect(readSceneImage(image, 'image', { pixels: 0, layers: 0 }, 0)).toEqual(image)
  }
  const [animated, still] = result.images
  expect(animated!.flipbook).toEqual({
    frameWidth: 2,
    frameHeight: 2,
    frames: [1, 1, 0],
    fps: 2,
    loop: true,
  })
  expect(Object.hasOwn(still!, 'flipbook')).toBe(false)
  expect(animated!.layers[0]!.pixels).not.toBe(still!.layers[0]!.pixels)
  expect(
    readSceneDocument({
      ...importDocumentBase({ id: 'images', name: 'Imagens', createdAt: 1, updatedAt: 2 }),
      images: result.images,
    }).status,
  ).toBe('valid')
  expect(input).toEqual(before)
  animated!.layers[0]!.pixels[0] = 199
  animated!.flipbook!.frames[0] = 0
  expect(still!.layers[0]!.pixels).toEqual(expected)
  expect(input).toEqual(before)
  expect(convert(input).images[0]!.layers[0]!.pixels).toEqual(expected)
})

test('bbmodel native texture sampling follows original top-down texels across animated holds and loops', () => {
  const input = fixture([
      { name: 'Quadros', fps: 4, frame_order_type: 'custom', frame_order: '1 1 0' },
    ]),
    image = convert(input).images[0]!
  for (let tick = 0; tick < 9; tick++) {
    const frame = sampleSceneFlipbook(image.flipbook!, tick / 4).frame
    expect(frame).toBe([1, 1, 0][tick % 3]!)
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        const point = sceneFlipbookTexel(image, [(x + 0.5) / 2, 1 - (y + 0.5) / 2], frame)!,
          actual = (point[1] * image.width + point[0]) * 4,
          source = ((frame * 2 + y) * 2 + x) * 4
        expect(image.layers[0]!.pixels.subarray(actual, actual + 4)).toEqual(
          topDown.subarray(source, source + 4),
        )
      }
  }
})

test('bbmodel raw 16-bit image conversion requires an explicit choice and rounds all 65536 sample values', () => {
  const samples = Array.from({ length: 65536 }, (_, i) => i),
    png = makePngFixture({ width: 128, height: 128, colorType: 6, depth: 16, samples }).bytes,
    input = fixture([{ name: '16 bits' }], png),
    before = structuredClone(input)
  failure(() => convert(input), 'unsupported', 'textures[0]')
  const result = convert(input, { rgba16: 'round-to-rgba8' }),
    image = result.images[0]!,
    pixels = image.layers[0]!.pixels
  expect(result.issues).toEqual([
    {
      code: 'rgba16-to-rgba8',
      texture: 0,
      path: 'textures[0]',
      targetId: 'bbmodel_image_0',
    },
  ])
  let error = 0
  for (let sample = 0; sample < 65536; sample++) {
    const y = Math.floor(sample / 512),
      channel = sample % 512,
      value = pixels[(127 - y) * 512 + channel]!
    // Independent integer expression; every RGBA value is covered, including alpha and endpoints.
    expect(value).toBe(Math.floor((sample + 128) / 257))
    error = Math.max(error, Math.abs(value * 257 - sample))
  }
  expect(error).toBe(128)
  expect(result.pixelBytes).toBe(65536)
  expect(readSceneImage(image, 'image', { pixels: 0, layers: 0 }, 0)).toEqual(image)
  expect(input).toEqual(before)
})

test('bbmodel image conversion owns Buffer-backed raster views without changing surrounding bytes', () => {
  const input = fixture(),
    raster = input.decoded.rasters[0]!,
    storage = Buffer.alloc(topDown.length + 6, 199)
  storage.set(topDown, 3)
  if (raster.depth !== 8) throw new Error('RGBA8 fixture expected')
  raster.rgba = storage.subarray(3, 3 + topDown.length)
  const before = Buffer.from(storage),
    result = convert(input)
  expect(storage.equals(before)).toBe(true)
  result.images[0]!.layers[0]!.pixels.fill(0)
  expect(storage.equals(before)).toBe(true)
})

test('bbmodel active layers never silently become the selected bitmap, while inactive descriptors are reported without execution', () => {
  const input = fixture([
    { name: 'Primeira' },
    { name: 'Camadas', layers_enabled: true, layers: [] },
  ])
  poison(input.decoded.rasters[0]!, 'rgba')
  failure(() => convert(input), 'unsupported', 'textures[1].layers_enabled')
  const inactive = fixture([{ name: 'Inativa', layers: [{ data_url: 'javascript:never()' }] }])
  poison(inactive.appearance.textures[0]!.layers, '0')
  const result = convert(inactive)
  expect(result.issues).toEqual([
    {
      code: 'inactive-texture-layers-omitted',
      texture: 0,
      path: 'textures[0].layers',
      targetId: 'bbmodel_image_0',
      count: 1,
    },
  ])
  expect(result.images[0]!.layers[0]!.pixels).toEqual(
    sceneRasterFromCanvas(2, 4, new Uint8ClampedArray(topDown)).pixels,
  )
})

test('bbmodel image selection excludes unrelated textures and name adaptation preserves whitespace and Unicode boundaries', () => {
  const input = fixture(
      [
        { name: '', layers_enabled: true },
        { name: '' },
        { name: '   ' },
        { name: `${'x'.repeat(127)}🎨tail` },
        { name: 'e\u0301' },
        {},
      ],
      undefined,
      '5.0',
      [3, 1, 4, 2, 5],
    ),
    before = structuredClone(input),
    result = convert(input)
  expect(result.images.map((image) => [image.id, image.name])).toEqual([
    ['bbmodel_image_3', 'x'.repeat(127)],
    ['bbmodel_image_1', 'Imagem 2'],
    ['bbmodel_image_4', 'e\u0301'],
    ['bbmodel_image_2', '   '],
    ['bbmodel_image_5', 'Imagem 6'],
  ])
  expect(result.issues.map((issue) => [issue.code, issue.path, issue.targetId])).toEqual([
    ['name-shortened', 'textures[3].name', 'bbmodel_image_3'],
    ['name-generated', 'textures[1].name', 'bbmodel_image_1'],
    ['name-generated', 'textures[5].name', 'bbmodel_image_5'],
  ])
  expect(result.byTexture.has(0)).toBe(false)
  expect(input).toEqual(before)
})

test('bbmodel image preflight checks every correspondence and precision policy before reading the first raster', () => {
  const png16 = makePngFixture({ width: 2, height: 2, colorType: 6, depth: 16 }).bytes,
    mixed = fixture([
      { name: '8 bits' },
      { name: '16 bits', source: `data:image/png;base64,${Buffer.from(png16).toString('base64')}` },
    ])
  for (const raster of mixed.decoded.rasters) poison(raster, 'rgba')
  failure(() => convert(mixed), 'unsupported', 'textures[1]')
  for (const change of ['binding', 'width', 'duplicate', 'missing'] as const) {
    const input = fixture([{ name: 'A' }, { name: 'B' }])
    poison(input.decoded.rasters[0]!, 'rgba')
    if (change === 'binding')
      input.decoded.textures = new Map([
        [0, 0],
        [1, 1],
      ])
    else if (change === 'width') input.layouts[1]!.width++
    else if (change === 'duplicate') input.layouts.push(input.layouts[0]!)
    else input.appearance.textures.pop()
    expect(() => convert(input)).toThrow('Mismatched bbmodel image stages')
  }
})

test('bbmodel converted image budgets charge independently editable aliases before reading pixels', () => {
  const png = encodePng(new Uint8Array(1024 * 1024 * 4).fill(23), 1024, 1024),
    input = fixture(
      Array.from({ length: 8 }, (_, i) => ({ name: `Imagem ${i}` })),
      png,
    ),
    result = convert(input)
  expect(input.decoded.rasters).toHaveLength(1)
  expect(result.pixelBytes).toBe(SCENE_LIMITS.pixelBytes)
  expect(new Set(result.images.map((image) => image.layers[0]!.pixels.buffer)).size).toBe(8)
  expect(result.images.every((image) => image.layers[0]!.pixels.length === 1024 * 1024 * 4)).toBe(
    true,
  )
  result.images[0]!.layers[0]!.pixels[0] = 199
  expect(result.images[1]!.layers[0]!.pixels[0]).toBe(23)
  expect(input.decoded.rasters[0]!.rgba[0]).toBe(23)
  // Private layout cost injected to exercise the aggregate materialization gate, not an external parser.
  input.layouts.push(input.layouts[0]!)
  poison(input.decoded.rasters[0]!, 'rgba')
  failure(() => convert(input), 'budget', 'textures')
  input.layouts = Array(SCENE_LIMITS.images + 1).fill(input.layouts[0])
  poison(input.appearance.textures, '0')
  failure(() => convert(input), 'budget', 'textures')
})

test('bbmodel image options are strict, unknown formats are not adopted and empty selection reads no pixels', () => {
  expect(readBbmodelImageOptions({})).toEqual({ rgba16: 'reject', layers: 'reject' })
  for (const value of [
    null,
    [],
    1,
    { rgba16: true },
    { rgba16: null },
    { rgba16: 'round' },
    { resize: true },
  ]) {
    failure(
      () => readBbmodelImageOptions(value as BbmodelImageOptions),
      'invalid',
      value && typeof value === 'object' && !Array.isArray(value)
        ? Object.hasOwn(value, 'resize')
          ? 'options.resize'
          : 'options.rgba16'
        : 'options',
    )
  }
  const input = fixture()
  input.appearance.modelFormat = 'plugin'
  poison(input.decoded.rasters[0]!, 'rgba')
  failure(() => convert(input), 'unsupported', 'meta.model_format')
  input.appearance.modelFormat = 'free'
  input.layouts = []
  expect(convert(input)).toEqual({ images: [], byTexture: new Map(), pixelBytes: 0, issues: [] })
})
