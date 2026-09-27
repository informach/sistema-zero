import { expect, test } from 'bun:test'
import { readBbmodelAppearance } from './bbmodelAppearance'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { BBMODEL_INPUT_LIMITS, BbmodelInputError } from './bbmodelInput'

function envelope(
  source: Record<string, unknown> = {},
  version: BbmodelVersion = '5.0',
  modelFormat = 'free',
) {
  return readBbmodelEnvelope(
    new TextEncoder().encode(
      JSON.stringify({
        meta: { format_version: version, model_format: modelFormat },
        ...source,
      }),
    ),
  )
}
function raw(source: Record<string, unknown>) {
  const result = envelope()
  Object.assign(result.json, source)
  return result
}
function failure(
  source: Record<string, unknown>,
  reason: BbmodelInputError['reason'],
  path: string,
) {
  let error: unknown
  try {
    readBbmodelAppearance(raw(source))
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(BbmodelInputError)
  expect((error as BbmodelInputError).reason).toBe(reason)
  expect((error as BbmodelInputError).path).toBe(path)
}

test('keeps per-texture UV dimensions separate from declared pixels in each format revision', () => {
  for (const version of ['4.9', '4.10', '5.0'] as const) {
    const parsed = envelope(
      {
        resolution: { width: 16, height: 32 },
        texture_groups: [
          {
            uuid: 'material',
            name: 'Pele 雪',
            is_material: true,
            material_config: { color_value: [10, 20, 30, 40], future: 'kept' },
          },
        ],
        textures: [
          {
            uuid: 'color',
            name: 'Pele',
            group: 'material',
            width: 256,
            height: 512,
            uv_width: 8.5,
            uv_height: 17,
            path: 'C:\\private\\color.png',
            relative_path: '../color%20.png',
            source: 'data:image/png;base64,not-decoded',
            internal: true,
            visible: false,
            use_as_default: true,
            layers_enabled: true,
            layers: [{ uuid: 'layer', source: 'https://example.invalid/no-fetch' }],
            render_mode: 'emissive',
            render_sides: 'double',
            wrap_mode: 'repeat',
            pbr_channel: 'normal',
            file_format: 'tga',
            fps: 12.5,
            frame_time: 2,
            frame_order_type: 'custom',
            frame_order: '0 2 1',
            frame_interpolate: true,
          },
        ],
      },
      version,
    )
    const before = structuredClone(parsed.json)
    const result = readBbmodelAppearance(parsed)
    expect(result.project).toEqual({ uvWidth: 16, uvHeight: 32, boxUv: null })
    const texture = result.textures[0]!
    expect([texture.width, texture.height, texture.uvWidth, texture.uvHeight]).toEqual([
      256, 512, 8.5, 17,
    ])
    expect(texture.group).toBe(0)
    expect(texture.path).toBe('C:\\private\\color.png')
    expect(texture.relativePath).toBe('../color%20.png')
    expect(texture.embedded).toBe('data:image/png;base64,not-decoded')
    expect([
      texture.internal,
      texture.visible,
      texture.useAsDefault,
      texture.layersEnabled,
    ]).toEqual([true, false, true, true])
    expect([
      texture.renderMode,
      texture.renderSides,
      texture.wrapMode,
      texture.pbrChannel,
      texture.fileFormat,
    ]).toEqual(['emissive', 'double', 'repeat', 'normal', 'tga'])
    expect([
      texture.fps,
      texture.frameTime,
      texture.frameOrderType,
      texture.frameOrder,
      texture.frameInterpolate,
    ]).toEqual([12.5, 2, 'custom', '0 2 1', true])
    expect(result.groups[0]!.materialConfig).toEqual({
      color_value: [10, 20, 30, 40],
      future: 'kept',
    })
    expect(texture.source).toBe((parsed.json.textures as Record<string, unknown>[])[0]!)
    expect(texture.layers).toBe(texture.source.layers as unknown[])
    expect(parsed.json).toEqual(before)
  }
})

test('preserves unknown modes, partial sizes and script-like strings without selecting a texture or deriving frame counts', () => {
  const parsed = envelope(
    {
      resolution: { width: 7 },
      textures: [
        {
          uuid: 'a',
          use_as_default: true,
          width: 0,
          uv_width: 2.5,
          render_mode: 'plugin_mode',
          source: 'javascript:throw new Error()',
          fps: -1,
          frame_time: 0,
          frame_order: 'query.life_time',
          wrap_mode: '',
        },
        { uuid: 'b', use_as_default: true },
      ],
    },
    '5.0',
    'unknown-plugin',
  )
  const result = readBbmodelAppearance(parsed)
  expect(result.modelFormat).toBe('unknown-plugin')
  expect(result.project).toEqual({ uvWidth: 7, uvHeight: null, boxUv: null })
  const [a, b] = result.textures
  expect([a!.width, a!.height, a!.uvWidth, a!.uvHeight]).toEqual([0, null, 2.5, null])
  expect(a!.embedded).toBe('javascript:throw new Error()')
  expect(a!.renderMode).toBe('plugin_mode')
  expect(a!.wrapMode).toBe('')
  expect([a!.fps, a!.frameTime, a!.frameOrder]).toEqual([-1, 0, 'query.life_time'])
  expect([
    b!.width,
    b!.height,
    b!.uvWidth,
    b!.uvHeight,
    b!.path,
    b!.relativePath,
    b!.embedded,
    b!.internal,
    b!.fps,
    b!.frameTime,
    b!.wrapMode,
  ]).toEqual(new Array(11).fill(null))
  expect([b!.visible, b!.layersEnabled, b!.frameInterpolate]).toEqual([true, false, false])
  expect([b!.renderMode, b!.renderSides, b!.pbrChannel, b!.fileFormat, b!.frameOrderType]).toEqual([
    'default',
    'auto',
    'color',
    'png',
    'loop',
  ])
  expect(b!.layers).toEqual([])
  expect(readBbmodelAppearance(envelope()).textures).toEqual([])
  expect(readBbmodelAppearance(envelope()).project).toEqual({
    uvWidth: null,
    uvHeight: null,
    boxUv: null,
  })
})

test('indexes explicit UUIDs in separate namespaces and refuses duplicate or dangling group references', () => {
  const result = readBbmodelAppearance(
    envelope({
      texture_groups: [{ uuid: '__proto__' }, { uuid: 'constructor' }],
      textures: [
        { uuid: '__proto__', group: 'constructor' },
        { uuid: 'A', group: '__proto__' },
        { uuid: 'a', group: '' },
      ],
    }),
  )
  expect(result.byTextureUuid.get('__proto__')).toBe(0)
  expect(result.byTextureUuid.get('A')).toBe(1)
  expect(result.byTextureUuid.get('a')).toBe(2)
  expect(result.textures.map((texture) => texture.group)).toEqual([1, 0, null])
  failure({ textures: [{ uuid: 'a' }, { uuid: 'a' }] }, 'invalid', 'textures[1].uuid')
  failure({ texture_groups: [{ uuid: 'a' }, { uuid: 'a' }] }, 'invalid', 'texture_groups[1].uuid')
  failure({ textures: [{ uuid: 'a', group: 'missing' }] }, 'invalid', 'textures[0].group')
  for (const uuid of [undefined, null, '', 1]) {
    failure({ textures: [{ uuid }] }, 'invalid', 'textures[0].uuid')
    failure({ texture_groups: [{ uuid }] }, 'invalid', 'texture_groups[0].uuid')
  }
})

test('validates optional fields and dense descriptor lists without coalescing null or non-finite numbers into defaults', () => {
  for (const field of ['width', 'height'])
    for (const value of [null, -1, 0.5, Infinity, 9007199254740992, '16'])
      failure({ textures: [{ uuid: 'a', [field]: value }] }, 'invalid', `textures[0].${field}`)
  for (const field of ['uv_width', 'uv_height'])
    for (const value of [null, 0, -1, Infinity, NaN, '16'])
      failure({ textures: [{ uuid: 'a', [field]: value }] }, 'invalid', `textures[0].${field}`)
  for (const field of [
    'source',
    'path',
    'relative_path',
    'group',
    'name',
    'render_mode',
    'render_sides',
    'wrap_mode',
    'pbr_channel',
    'file_format',
    'frame_order_type',
    'frame_order',
  ])
    failure({ textures: [{ uuid: 'a', [field]: null }] }, 'invalid', `textures[0].${field}`)
  for (const field of [
    'internal',
    'visible',
    'use_as_default',
    'layers_enabled',
    'frame_interpolate',
  ])
    for (const value of [null, 0, 'false'])
      failure({ textures: [{ uuid: 'a', [field]: value }] }, 'invalid', `textures[0].${field}`)
  for (const field of ['fps', 'frame_time'])
    for (const value of [null, Infinity, NaN, '7'])
      failure({ textures: [{ uuid: 'a', [field]: value }] }, 'invalid', `textures[0].${field}`)
  for (const field of ['textures', 'texture_groups']) {
    for (const value of [null, {}, false]) failure({ [field]: value }, 'invalid', field)
    failure({ [field]: new Array(1) }, 'invalid', `${field}[0]`)
    failure({ [field]: [null] }, 'invalid', `${field}[0]`)
  }
  failure({ textures: [{ uuid: 'a', layers: null }] }, 'invalid', 'textures[0].layers')
  failure(
    { texture_groups: [{ uuid: 'g', material_config: null }] },
    'invalid',
    'texture_groups[0].material_config',
  )
  failure(
    { texture_groups: [{ uuid: 'g', is_material: null }] },
    'invalid',
    'texture_groups[0].is_material',
  )
  failure({ resolution: null }, 'invalid', 'resolution')
  failure({ resolution: { width: 0 } }, 'invalid', 'resolution.width')
})

test('preflights descriptor, layer and embedded-text budgets before numeric metadata, including disabled layers', () => {
  const textures = Array.from({ length: BBMODEL_INPUT_LIMITS.textures }, (_, i) => ({
    uuid: `t${i}`,
  }))
  expect(readBbmodelAppearance(raw({ textures })).textures).toHaveLength(
    BBMODEL_INPUT_LIMITS.textures,
  )
  failure({ textures: [...textures, null] }, 'budget', 'textures')
  const groups = Array.from({ length: BBMODEL_INPUT_LIMITS.textureGroups }, (_, i) => ({
    uuid: `g${i}`,
  }))
  expect(readBbmodelAppearance(raw({ texture_groups: groups })).groups).toHaveLength(
    BBMODEL_INPUT_LIMITS.textureGroups,
  )
  failure(
    { texture_groups: [...groups, null], textures: [{ uuid: 'a', width: 'bad' }] },
    'budget',
    'texture_groups',
  )
  const layers = new Array(BBMODEL_INPUT_LIMITS.textureLayers).fill({
    source: 'opaque-layer-metadata',
  })
  const result = readBbmodelAppearance(
    raw({ textures: [{ uuid: 'a', layers_enabled: false, layers }] }),
  )
  expect(result.textures[0]!.layers).toHaveLength(BBMODEL_INPUT_LIMITS.textureLayers)
  failure(
    {
      textures: [
        { uuid: 'a', width: 'bad', layers },
        { uuid: 'b', layers: [{}] },
      ],
    },
    'budget',
    'textures.layers',
  )
  const half = 'x'.repeat(BBMODEL_INPUT_LIMITS.embeddedTextChars / 2)
  expect(
    readBbmodelAppearance(
      raw({
        textures: [
          { uuid: 'a', source: half },
          { uuid: 'b', source: half },
        ],
      }),
    ).textures,
  ).toHaveLength(2)
  failure(
    {
      textures: [
        { uuid: 'a', width: 'bad', source: half },
        { uuid: 'b', source: `${half}x` },
      ],
    },
    'budget',
    'textures.source',
  )
  const max = 'x'.repeat(BBMODEL_INPUT_LIMITS.identifierChars)
  expect(
    readBbmodelAppearance(raw({ textures: [{ uuid: max, path: max, relative_path: max }] }))
      .textures[0]!.path,
  ).toBe(max)
  failure({ textures: [{ uuid: 'a', path: `${max}x` }] }, 'budget', 'textures[0].path')
})
