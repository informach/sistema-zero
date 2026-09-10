import { expect, test } from 'bun:test'
import { encodePng } from '../export/png'
import type { SceneImage } from '../scene/document'
import {
  readSceneImageFlipbook,
  sampleSceneFlipbook,
  sceneFlipbookTexel,
} from '../scene/imageFlipbook'
import { sceneRasterFromCanvas } from '../scene/imageImport'
import { SCENE_LIMITS } from '../scene/limits'
import { readBbmodelAppearance } from './bbmodelAppearance'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { BbmodelInputError } from './bbmodelInput'
import { decodeBbmodelRasters } from './bbmodelRasters'
import { readBbmodelResources } from './bbmodelResources'
import { planBbmodelTextureLayouts } from './bbmodelTextureLayouts'

function fixture(
  textures: Record<string, unknown>[] = [{}],
  width = 2,
  height = 8,
  version: BbmodelVersion = '5.0',
) {
  const pixels = Uint8Array.from({ length: width * height * 4 }, (_, i) =>
      i % 4 === 3 ? 255 : (i * 17 + 5) % 256,
    ),
    png = encodePng(pixels, width, height),
    bytes = new TextEncoder().encode(
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
    envelope = readBbmodelEnvelope(bytes),
    appearance = readBbmodelAppearance(envelope),
    indices = textures.map((_, index) => index),
    resources = readBbmodelResources({
      bytes,
      entryPath: 'model.bbmodel',
      version,
      appearance,
      textureIndices: indices,
      files: [],
      sourcePreference: 'prefer-embedded',
    })
  if (resources.status !== 'ready') throw new Error('Embedded fixture expected')
  const decoded = decodeBbmodelRasters(resources)
  return {
    appearance,
    decoded,
    indices,
    pixels,
    run: () => planBbmodelTextureLayouts(appearance, decoded, indices),
  }
}
function fails(run: () => unknown, reason: BbmodelInputError['reason'], path: string) {
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
] as const)('bbmodel %s uses decoded pixels and logical UV aspect for frame count, preserving raster aliases with different metadata', (version) => {
  const f = fixture(
      [
        { width: 999, height: 0, fps: 12 },
        { uv_width: 2, uv_height: 8, fps: 999 },
      ],
      2,
      8,
      version,
    ),
    before = structuredClone({ appearance: f.appearance, decoded: f.decoded }),
    result = f.run()
  expect(f.decoded.rasters).toHaveLength(1)
  expect(result.pixelBytes).toBe(2 * 2 * 8 * 4)
  expect(result.textures[0]).toEqual({
    texture: 0,
    raster: 0,
    width: 2,
    height: 8,
    uvSize: [2, 2],
    flipbook: { frameWidth: 2, frameHeight: 2, frames: [0, 1, 2, 3], fps: 12, loop: true },
  })
  expect(result.textures[1]).toEqual({
    texture: 1,
    raster: 0,
    width: 2,
    height: 8,
    uvSize: [2, 8],
    flipbook: null,
  })
  expect(result.issues).toEqual([
    {
      code: 'declared-pixel-size-differs',
      texture: 0,
      path: 'textures[0]',
      declared: [999, 0],
      actual: [2, 8],
    },
    { code: 'texture-flipbook-materialized', texture: 0, path: 'textures[0]', frames: 4 },
  ])
  expect(readSceneImageFlipbook(result.textures[0]!.flipbook, result.textures[0]!)).toEqual(
    result.textures[0]!.flipbook!,
  )
  result.textures[0]!.flipbook!.frames[0] = 3
  result.textures[0]!.uvSize[0] = 99
  expect(f.run().textures[0]!.flipbook!.frames[0]).toBe(0)
  expect({ appearance: f.appearance, decoded: f.decoded }).toEqual(before)
})

test('bbmodel loop, reverse, ping-pong and custom order preserve holds and native playback at exact ticks', () => {
  for (const [frame_order_type, frame_order, expected] of [
    ['loop', '', [0, 1, 2, 3]],
    ['backwards', '', [3, 2, 1, 0]],
    ['back_and_forth', '', [0, 1, 2, 3, 2, 1]],
    ['custom', '3 3 0 +2 9', [3, 3, 0, 2, 1]],
    ['custom', '', [0, 1, 2, 3]],
  ] as const) {
    const result = fixture([{ frame_order_type, frame_order, fps: 2 }]).run(),
      flipbook = result.textures[0]!.flipbook!
    expect(flipbook.frames).toEqual([...expected])
    for (let step = 0; step < expected.length * 3; step++)
      expect(sampleSceneFlipbook(flipbook, step / 2).frame).toBe(expected[step % expected.length]!)
    expect(result.issues.filter((issue) => issue.code === 'frame-indices-wrapped')).toEqual(
      frame_order.includes('9')
        ? [{ code: 'frame-indices-wrapped', texture: 0, path: 'textures[0].frame_order', count: 1 }]
        : [],
    )
  }
})

test('bbmodel frame-local UV and native sheet numbering pick the original upright pixels through playback', () => {
  const f = fixture(),
    layout = f.run().textures[0]!,
    raster = sceneRasterFromCanvas(2, 8, new Uint8ClampedArray(f.pixels)),
    image: SceneImage = {
      id: 'image',
      name: 'Folha',
      width: 2,
      height: 8,
      encoding: 'rgba',
      flipbook: layout.flipbook!,
      layers: [{ id: 'layer', name: 'Camada', visible: true, opacity: 1, pixels: raster.pixels }],
    }
  for (const frame of [0, 1, 2, 3]) {
    // Authorial (0.5, 0.5) in a 2x2 logical UV frame becomes native (0.25, 0.75).
    const [x, y] = sceneFlipbookTexel(image, [0.25, 0.75], frame)!,
      offset = (y * 2 + x) * 4,
      original = frame * 2 * 2 * 4
    expect([...raster.pixels.subarray(offset, offset + 4)]).toEqual([
      ...f.pixels.subarray(original, original + 4),
    ])
  }
})

test('bbmodel FPS defaults to seven, retains fractional rates and reports the source runtime minimum without using mcmeta timing', () => {
  expect(fixture().run().textures[0]!.flipbook!.fps).toBe(7)
  for (const fps of [1, 2.5, 60])
    expect(fixture([{ fps, frame_time: 1000 }]).run().textures[0]!.flipbook!.fps).toBe(fps)
  for (const fps of [0, -3, 0.25]) {
    const result = fixture([{ fps }]).run()
    expect(result.textures[0]!.flipbook!.fps).toBe(1)
    expect(result.issues[1]).toEqual({
      code: 'texture-fps-floor',
      texture: 0,
      path: 'textures[0].fps',
      source: fps,
      target: 1,
    })
  }
  fails(() => fixture([{ fps: 60.01 }]).run(), 'unsupported', 'textures[0].fps')
})

test('bbmodel native frames require integral pixel rows and preserve the source aspect margin without resampling', () => {
  expect(
    fixture([{ uv_width: 1.025, uv_height: 1 }], 2, 4).run().textures[0]!.flipbook!.frames,
  ).toEqual([0, 1])
  fails(
    () => fixture([{ uv_width: 1.026, uv_height: 1 }], 2, 4).run(),
    'unsupported',
    'textures[0]',
  )
  fails(() => fixture([{}], 2, 7).run(), 'unsupported', 'textures[0]')
  const huge = fixture([{ uv_width: 1e308, uv_height: 1e-308 }])
  fails(() => huge.run(), 'unsupported', 'textures[0]')
})

test('bbmodel frame cells and sequence are separately budgeted at their exact native limits', () => {
  const exact = fixture([{ uv_width: 1, uv_height: 1 }], 1, 256).run().textures[0]!.flipbook!
  expect(exact.frames).toHaveLength(256)
  expect(exact.frameHeight).toBe(1)
  expect(exact.frames[255]).toBe(255)
  fails(() => fixture([{ uv_width: 1, uv_height: 1 }], 1, 257).run(), 'budget', 'textures[0]')
  expect(
    fixture([{ uv_width: 1, uv_height: 1, frame_order_type: 'back_and_forth' }], 1, 129).run()
      .textures[0]!.flipbook!.frames,
  ).toHaveLength(256)
  fails(
    () =>
      fixture([{ uv_width: 1, uv_height: 1, frame_order_type: 'back_and_forth' }], 1, 130).run(),
    'budget',
    'textures[0].frame_order_type',
  )
  expect(
    fixture([{ frame_order_type: 'custom', frame_order: Array(256).fill('0').join(' ') }]).run()
      .textures[0]!.flipbook!.frames,
  ).toHaveLength(256)
  fails(
    () =>
      fixture([{ frame_order_type: 'custom', frame_order: Array(257).fill('0').join(' ') }]).run(),
    'budget',
    'textures[0].frame_order',
  )
})

test('bbmodel custom frame parsing refuses ambiguous source fallback steps, expressions and unsafe indices without trimming or coercion', () => {
  for (const frame_order of [
    ' 1 2',
    '1 2 ',
    ' ',
    '1x 2',
    '1:3',
    '1.5',
    '-1',
    'NaN',
    'Infinity',
    '0x10',
    '9007199254740992',
    '1;alert(1)',
  ])
    fails(
      () => fixture([{ frame_order_type: 'custom', frame_order }]).run(),
      'unsupported',
      'textures[0].frame_order',
    )
  fails(
    () => fixture([{ frame_order_type: 'future' }]).run(),
    'unsupported',
    'textures[0].frame_order_type',
  )
})

test('bbmodel layouts charge aliases before sequences or pixels; unselected textures are not inspected and selections are deduplicated', () => {
  const f = fixture(
    Array.from({ length: 9 }, () => ({})),
    1024,
    1024,
  )
  poison(f.decoded.rasters[0]!, 'rgba')
  poison(f.appearance.textures[8]!, 'uvWidth')
  fails(() => f.run(), 'budget', 'textures')
  const exact = planBbmodelTextureLayouts(f.appearance, f.decoded, [0, 1, 2, 3, 4, 5, 6, 7, 7])
  expect(exact.pixelBytes).toBe(SCENE_LIMITS.pixelBytes)
  expect(exact.textures).toHaveLength(8)
  const tooMany = { ...f.appearance }
  poison(tooMany, 'textures')
  fails(
    () =>
      planBbmodelTextureLayouts(
        tooMany,
        f.decoded,
        Array.from({ length: SCENE_LIMITS.images + 1 }, (_, i) => i),
      ),
    'budget',
    'textures',
  )
  const single = fixture()
  single.decoded.textures = new Map()
  fails(() => single.run(), 'invalid', 'textures[0]')
  single.appearance.modelFormat = 'future'
  fails(() => single.run(), 'unsupported', 'meta.model_format')
})

test('bbmodel static images do not consume irrelevant playback, pixel buffers, layers or file metadata', () => {
  const f = fixture([{}], 2, 2)
  for (const key of [
    'fps',
    'frameOrderType',
    'frameOrder',
    'frameTime',
    'frameInterpolate',
    'source',
    'layers',
    'embedded',
    'path',
  ])
    poison(f.appearance.textures[0]!, key)
  poison(f.decoded.rasters[0]!, 'rgba')
  expect(f.run().textures[0]!.flipbook).toBeNull()
  expect(f.run().issues).toEqual([])
})
