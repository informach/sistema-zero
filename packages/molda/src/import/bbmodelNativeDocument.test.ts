import { expect, test } from 'bun:test'
import sharp from 'sharp'
import { encodePng } from '../export/png'
import { encodeSceneGlb } from '../export/sceneGlb'
import { readSceneDocument } from '../scene/readDocument'
import { readGlb, readImage } from '../testing/glbRead'
import { expectValidGlb } from '../testing/gltfValidation'
import type { BbmodelVersion } from './bbmodelEnvelope'
import { BBMODEL_CUBE_DIRECTIONS } from './bbmodelGeometryTypes'
import { BBMODEL_INPUT_LIMITS, BbmodelInputError } from './bbmodelInput'
import { type BbmodelNativeRequest, convertBbmodelDocument } from './bbmodelNativeDocument'
import { type BbmodelNativeOptions, readBbmodelNativeOptions } from './bbmodelNativeOptions'
import { BBMODEL_REPORT_LIMITS, BbmodelReportBudget } from './bbmodelReportLimits'

const identity = { id: 'imported', name: 'Meu modelo', createdAt: 1, updatedAt: 2 },
  options = {
    sourcePreference: 'prefer-embedded',
    surfaces: { normals: 'molda-flat' },
    nodeMaterials: { untextured: 'uniform', color: [0.5, 0.25, 0.75, 1] },
    textureMaterials: { lighting: 'molda-standard' },
  } satisfies BbmodelNativeOptions,
  topDown = Uint8Array.of(10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 100, 110, 120, 255),
  png = encodePng(topDown, 2, 2),
  dataUri = `data:image/png;base64,${Buffer.from(png).toString('base64')}`

function model(version: BbmodelVersion = '5.0') {
  const group = { uuid: 'root', name: 'Grupo', origin: [3, 4, 5] }
  return {
    meta: { format_version: version, model_format: 'free' },
    resolution: { width: 2, height: 2 },
    elements: [
      {
        uuid: 'cube',
        type: 'cube',
        name: 'Caixa',
        from: [0, 0, 0],
        to: [2, 2, 2],
        origin: [1, 1, 1],
        faces: Object.fromEntries(
          BBMODEL_CUBE_DIRECTIONS.map((face) => [face, { uv: [0, 0, 2, 2], texture: false }]),
        ),
      },
      {
        uuid: 'mesh',
        type: 'mesh',
        name: 'Pintura',
        vertices: { a: [0, 0, 0], b: [2, 0, 0], c: [0, 2, 0] },
        faces: {
          face: {
            vertices: ['a', 'b', 'c'],
            texture: 0,
            uv: { a: [0.5, 0.5], b: [1.5, 0.5], c: [0.5, 1.5] },
          },
        },
      },
    ],
    textures: [{ uuid: 'paint', name: 'Tinta', render_sides: 'front', source: dataUri }],
    ...(version === '5.0'
      ? { groups: [group], outliner: [{ uuid: 'root', children: ['cube', 'mesh'] }] }
      : { outliner: [{ ...group, children: ['cube', 'mesh'] }] }),
  }
}
function request(
  json: unknown = model(),
  files: BbmodelNativeRequest['files'] = [],
): BbmodelNativeRequest {
  return {
    bytes: new TextEncoder().encode(JSON.stringify(json)),
    entryPath: 'model.bbmodel',
    files,
  }
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
  return error as BbmodelInputError
}
const at = (path: string) => `files["model.bbmodel"].${path}`

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s converts an actual complete source to owned editable hierarchy/paint, report and independently decoded GLB', async (version) => {
  const input = request(model(version)),
    before = structuredClone(input),
    result = convertBbmodelDocument(input, identity, options)
  if (result.status !== 'ready') throw new Error('Embedded project expected')
  const { document, report } = result
  expect(readSceneDocument(document).status).toBe('valid')
  expect(document.nodes.map((node) => [node.id, node.parentId])).toEqual([
    ['bbmodel_node_2', null],
    ['bbmodel_node_0', 'bbmodel_node_2'],
    ['bbmodel_node_1', 'bbmodel_node_2'],
  ])
  expect(document.materials).toHaveLength(3)
  expect(document.images).toHaveLength(1)
  expect(report.review).toBe('required')
  expect(report.source).toEqual({
    format: 'bbmodel',
    version,
    modelFormat: 'free',
    entryPath: 'model.bbmodel',
    nodes: 3,
    omittedNodes: 0,
    textures: 1,
    unusedTextures: 0,
    textureGroups: 0,
    selectedFileBytes: input.bytes.byteLength,
    originalFile: 'not-retained',
    auxiliaryMetadata: 'not-stored',
  })
  expect(report.costs).toEqual({
    nodes: 3,
    instances: 2,
    geometries: 2,
    vertices: 11,
    looseEdges: 0,
    storedTriangles: 13,
    drawTriangles: 13,
    materials: 3,
    images: 1,
    pixelBytes: 16,
    skins: 0,
    weightedVertices: 0,
    clips: 0,
    tracks: 0,
    keys: 0,
  })
  expect(report.issues.map((row) => row.stage)).toEqual([
    'surfaces',
    'surfaces',
    'node-materials',
    'texture-materials',
    'resources',
  ])
  const bytes = encodeSceneGlb(document).bytes
  await expectValidGlb(bytes)
  expect(
    new Uint8Array(
      await sharp(readImage(readGlb(bytes), 0))
        .ensureAlpha()
        .raw()
        .toBuffer(),
    ),
  ).toEqual(topDown)
  const second = convertBbmodelDocument(input, identity, options)
  expect(second).toEqual(result)
  document.images[0]!.layers[0]!.pixels[0] = 255
  const material = document.materials[0]!.baseColor
  if (material.kind !== 'rgba') throw new Error('RGBA expected')
  material.value[0] = 1
  const colorIssue = report.issues.find((issue) => issue.stage === 'node-materials')
  if (
    colorIssue?.stage !== 'node-materials' ||
    colorIssue.detail.code !== 'untextured-appearance-adapted'
  )
    throw new Error('Uniform adaptation expected')
  expect(colorIssue.detail.color).toEqual([0.5, 0.25, 0.75, 1])
  expect(options.nodeMaterials.color).toEqual([0.5, 0.25, 0.75, 1])
  expect(input).toEqual(before)
  expect(second).not.toEqual(result)
})

test('bbmodel unknown root/node/face/texture fields are rejected or individually reported, never executed', () => {
  const original = model(),
    source = {
      ...original,
      editor_state: { code: 'throw new Error("never execute")' },
      elements: original.elements.map((element, i) =>
        i === 0
          ? {
              ...element,
              custom_setting: { enabled: true },
              faces: {
                ...element.faces,
                north: { uv: [0, 0, 2, 2], texture: false, plugin_flag: 'preserve?' },
              },
            }
          : element,
      ),
      textures: original.textures.map((texture) => ({ ...texture, custom_data: ['opaque'] })),
    },
    input = request(source)
  failure(
    () => convertBbmodelDocument(input, identity, options),
    'unsupported',
    at('json["editor_state"]'),
  )
  const result = convertBbmodelDocument(input, identity, {
    ...options,
    remainder: { unmapped: 'discard' },
  })
  if (result.status !== 'ready') throw new Error('Ready expected')
  expect(
    result.report.issues
      .filter((issue) => issue.stage === 'remainder')
      .map((issue) => issue.detail),
  ).toEqual([
    { code: 'unmapped-field-discarded', path: 'json["editor_state"]' },
    { code: 'unmapped-field-discarded', path: 'elements[0]["custom_setting"]' },
    { code: 'unmapped-field-discarded', path: 'elements[0].faces["north"]["plugin_flag"]' },
    { code: 'unmapped-field-discarded', path: 'textures[0]["custom_data"]' },
  ])
})

test('bbmodel static omission of clips/controllers is explicit and preserves the original file', () => {
  const input = request({
      ...model(),
      animations: [{ name: 'Pular', expression: 'variable.x; evil()' }],
      animation_controllers: [{ name: 'Jogo', states: { arbitrary: 'opaque' } }],
    }),
    before = structuredClone(input)
  failure(() => convertBbmodelDocument(input, identity, options), 'unsupported', at('animations'))
  const result = convertBbmodelDocument(input, identity, {
    ...options,
    remainder: { animations: 'omit' },
  })
  if (result.status !== 'ready') throw new Error('Ready expected')
  expect(result.document.animations).toBeUndefined()
  expect(
    result.report.issues
      .filter((issue) => issue.stage === 'remainder')
      .map((issue) => issue.detail),
  ).toEqual([
    { code: 'animations-omitted', path: 'animations', count: 1 },
    { code: 'animation-controllers-omitted', path: 'animation_controllers', count: 1 },
  ])
  expect(input).toEqual(before)
  for (const animations of [null, {}, 'expression'])
    failure(
      () =>
        convertBbmodelDocument(request({ ...model(), animations }), identity, {
          ...options,
          remainder: { animations: 'omit' },
        }),
      'invalid',
      at('animations'),
    )
})

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s resolves relative companions with no partial success or image fallback', (version) => {
  const original = model(version),
    input = request({
      ...original,
      textures: [{ ...original.textures[0], source: undefined, relative_path: 'paint.png' }],
    }),
    expected = version === '4.9' ? 'model.bbmodel/paint.png' : 'paint.png'
  expect(convertBbmodelDocument(input, identity, options)).toEqual({
    status: 'missing',
    paths: [expected],
  })
  input.files = [{ path: expected, bytes: png }]
  const before = structuredClone(input),
    result = convertBbmodelDocument(input, identity, options)
  if (result.status !== 'ready') throw new Error('Local project expected')
  expect(result.report.issues.find((issue) => issue.stage === 'resources')?.detail).toEqual({
    texture: 0,
    resource: 0,
    source: 'file',
    alternateAvailable: false,
    pathFieldIgnored: false,
    code: 'texture-resource-selected',
    path: 'textures[0]',
  })
  expect(input).toEqual(before)
})

test('bbmodel reads all known omitted metadata and fails cheap surface/layer/option gates before invalid embedded bytes', () => {
  const original = model(),
    invalidRaster = {
      ...original,
      textures: [{ ...original.textures[0], source: 'data:image/png;base64,AAAA' }],
    }
  failure(
    () => convertBbmodelDocument(request(invalidRaster), identity, { ...options, surfaces: {} }),
    'unsupported',
    at('elements[0]'),
  )
  failure(
    () =>
      convertBbmodelDocument(
        request({
          ...invalidRaster,
          textures: [{ ...invalidRaster.textures[0], layers_enabled: true }],
        }),
        identity,
        options,
      ),
    'unsupported',
    at('textures[0].layers_enabled'),
  )
  failure(
    () =>
      convertBbmodelDocument(request(invalidRaster), identity, {
        ...options,
        textureMaterials: {},
      }),
    'unsupported',
    'options.textureMaterials.lighting',
  )
  for (const extra of [
    { uuid: 'unlisted', type: 'cube', color: 'wrong', from: [0, 0, 0], to: [1, 1, 1] },
    { uuid: 'unlisted', type: 'mesh', color: 1, vertices: { a: ['wrong', 0, 0] }, faces: {} },
  ]) {
    const input = request({ ...original, elements: [...original.elements, extra] })
    const path = extra.type === 'cube' ? 'elements[2].color' : 'elements[2].vertices["a"][0]'
    failure(
      () =>
        convertBbmodelDocument(input, identity, { ...options, selection: { unlisted: 'omit' } }),
      'invalid',
      at(path),
    )
  }
})

test('bbmodel selected byte count and host identity/options are validated before entry JSON', () => {
  const invalid = request()
  invalid.bytes = Uint8Array.of(123)
  failure(
    () => convertBbmodelDocument(invalid, { ...identity, id: '' }, options),
    'invalid',
    'identity.id',
  )
  failure(
    () =>
      convertBbmodelDocument(invalid, identity, {
        ...options,
        images: { rgba16: 'auto' },
      } as unknown as BbmodelNativeOptions),
    'invalid',
    'options.images.rgba16',
  )
  const large = new Uint8Array(BBMODEL_INPUT_LIMITS.fileBytes)
  invalid.files = [
    { path: 'a.png', bytes: large },
    { path: 'b.png', bytes: large },
  ]
  failure(() => convertBbmodelDocument(invalid, identity, options), 'budget', 'files')
  invalid.files = []
  const shared = new Uint8Array(new SharedArrayBuffer(1))
  failure(
    () => convertBbmodelDocument({ ...invalid, bytes: shared }, identity, options),
    'unsupported',
    'file',
  )
})

test('bbmodel native options reject unknown/null groups even for an empty model and own the color', () => {
  const empty = request({ meta: { format_version: '5.0', model_format: 'free' } }),
    result = convertBbmodelDocument(empty, identity, { sourcePreference: 'prefer-embedded' })
  if (result.status !== 'ready') throw new Error('Empty native project expected')
  expect(result.report.issues).toEqual([])
  expect(result.document.nodes).toEqual([])
  for (const key of [
    'selection',
    'geometry',
    'positions',
    'uvs',
    'surfaces',
    'nodeMaterials',
    'textureMaterials',
    'images',
    'hierarchy',
    'remainder',
  ]) {
    failure(
      () =>
        convertBbmodelDocument(empty, identity, {
          sourcePreference: 'prefer-embedded',
          [key]: null,
        } as unknown as BbmodelNativeOptions),
      'invalid',
      `options.${key}`,
    )
  }
  failure(
    () => readBbmodelNativeOptions({ ...options, typo: true } as BbmodelNativeOptions),
    'invalid',
    'options.typo',
  )
  const parsed = readBbmodelNativeOptions(options)
  parsed.nodeMaterials.color[0] = 1
  expect(options.nodeMaterials.color[0]).toBe(0.5)
})

test('bbmodel report budgets reject excess issues, path and text without truncating diagnostics', () => {
  const report = new BbmodelReportBudget(),
    issue = { detail: { path: '' } }
  for (let i = 0; i < BBMODEL_REPORT_LIMITS.issues; i++) report.addIssue(issue)
  failure(() => report.addIssue(issue), 'budget', 'report.issues')
  failure(
    () =>
      new BbmodelReportBudget().addIssue({
        detail: { path: 'x'.repeat(BBMODEL_REPORT_LIMITS.pathChars + 1) },
      }),
    'budget',
    'report.path',
  )
  const text = new BbmodelReportBudget()
  text.addText('x'.repeat(BBMODEL_REPORT_LIMITS.textChars))
  failure(() => text.addText('x'), 'budget', 'report.text')
})

test('bbmodel extra cube face entries and separate-group children are not implicitly covered by known containers', () => {
  const original = model(),
    input = request({
      ...original,
      groups: [{ uuid: 'root', name: 'Grupo', origin: [3, 4, 5], children: ['ghost'] }],
    })
  failure(
    () => convertBbmodelDocument(input, identity, options),
    'unsupported',
    at('groups[0]["children"]'),
  )
  const result = convertBbmodelDocument(input, identity, {
    ...options,
    remainder: { unmapped: 'discard' },
  })
  if (result.status !== 'ready') throw new Error('Ready expected')
  expect(
    result.report.issues
      .filter((issue) => issue.stage === 'remainder')
      .map((issue) => issue.detail.path),
  ).toEqual(['groups[0]["children"]'])
  expect(result.document.nodes).toHaveLength(3)
  expect(result.report.costs.storedTriangles).toBe(13)
  const extraFace = request({
    ...original,
    elements: original.elements.map((row, i) =>
      i === 0 ? { ...row, faces: { ...row.faces, extra: { texture: 0 } } } : row,
    ),
  })
  for (const unmapped of ['reject', 'discard'] as const)
    failure(
      () => convertBbmodelDocument(extraFace, identity, { ...options, remainder: { unmapped } }),
      'unsupported',
      at('elements[0].faces'),
    )
})

test('bbmodel composed conversion retains flipbook and inactive-layer diagnostics without adopting layer contents', () => {
  const original = model(),
    pixels = new Uint8Array([...topDown, ...topDown]),
    input = request({
      ...original,
      textures: [
        {
          ...original.textures[0],
          source: `data:image/png;base64,${Buffer.from(encodePng(pixels, 2, 4)).toString('base64')}`,
          layers: [{ data_url: 'not-an-image', code: 'do not execute' }],
        },
      ],
    }),
    result = convertBbmodelDocument(input, identity, options)
  if (result.status !== 'ready') throw new Error('Ready expected')
  expect(result.document.images[0]!.flipbook).toEqual({
    frameWidth: 2,
    frameHeight: 2,
    frames: [0, 1],
    fps: 7,
    loop: true,
  })
  expect(
    result.report.issues.filter((issue) => issue.stage === 'layouts' || issue.stage === 'images'),
  ).toEqual([
    {
      stage: 'layouts',
      detail: { code: 'texture-flipbook-materialized', texture: 0, path: 'textures[0]', frames: 2 },
    },
    {
      stage: 'images',
      detail: {
        code: 'inactive-texture-layers-omitted',
        texture: 0,
        path: 'textures[0].layers',
        targetId: 'bbmodel_image_0',
        count: 1,
      },
    },
  ])
  expect(result.report.costs.pixelBytes).toBe(32)
})

test('bbmodel aggregate diagnostic text budget precedes native coordinate materialization and invalid raster decoding', () => {
  const original = model(),
    prefix = 'x'.repeat(4088),
    input = request({
      ...original,
      ...Object.fromEntries(Array.from({ length: 1025 }, (_, i) => [prefix + i, null])),
      elements: original.elements.map((row, i) =>
        i === 1
          ? {
              ...row,
              vertices: { a: [1e308, 0, 0], b: [2, 0, 0], c: [0, 2, 0] },
            }
          : row,
      ),
      textures: [{ ...original.textures[0], source: 'data:image/png;base64,AAAA' }],
    })
  failure(
    () =>
      convertBbmodelDocument(input, identity, { ...options, remainder: { unmapped: 'discard' } }),
    'budget',
    'report.text',
  )
})

test('bbmodel dropping unlisted pieces does not bypass known source validation or read unused image resources', () => {
  const original = model(),
    input = request({
      ...original,
      elements: [
        ...original.elements,
        { uuid: 'unused', type: 'mesh', vertices: {}, faces: {}, plugin_data: { arbitrary: true } },
      ],
      textures: [...original.textures, { uuid: 'unused-paint', source: 'not-an-image' }],
    }),
    result = convertBbmodelDocument(input, identity, {
      ...options,
      selection: { unlisted: 'omit' },
    })
  if (result.status !== 'ready') throw new Error('Ready expected')
  expect(result.report.source.omittedNodes).toBe(1)
  expect(result.report.source.unusedTextures).toBe(1)
  expect(result.report.issues[0]).toEqual({
    stage: 'selection',
    detail: { code: 'unlisted-nodes-omitted', path: 'outliner', count: 1 },
  })
  expect(result.document.images).toHaveLength(1)
})
