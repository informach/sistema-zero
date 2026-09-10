import { expect, test } from 'bun:test'
import { ClampToEdgeWrapping, DataTexture, Mesh, MeshStandardMaterial, NearestFilter } from 'three'
import { encodePng } from '../export/png'
import { encodeSceneGlb } from '../export/sceneGlb'
import { buildSceneGeometry } from '../scene/geometry'
import { SCENE_LIMITS } from '../scene/limits'
import { readSceneDocument } from '../scene/readDocument'
import { expectValidGlb } from '../testing/gltfValidation'
import { SceneRenderResource } from '../viewport/sceneRenderResource'
import { readBbmodelAppearance } from './bbmodelAppearance'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { convertBbmodelFaceUvs } from './bbmodelFaceUvs'
import { convertBbmodelGeometries } from './bbmodelGeometries'
import { readBbmodelGeometry } from './bbmodelGeometry'
import { BBMODEL_CUBE_DIRECTIONS } from './bbmodelGeometryTypes'
import { readBbmodelGraph } from './bbmodelGraph'
import { convertBbmodelHierarchy } from './bbmodelHierarchy'
import { convertBbmodelImages } from './bbmodelImages'
import { BbmodelInputError } from './bbmodelInput'
import { planBbmodelNativeGeometry } from './bbmodelNativeGeometryPlan'
import { convertBbmodelNativeUvs } from './bbmodelNativeUvs'
import { convertBbmodelNodeMaterials } from './bbmodelNodeMaterials'
import { readBbmodelNodeMetadata } from './bbmodelNodeMetadata'
import { convertBbmodelPositions } from './bbmodelPositions'
import { decodeBbmodelRasters } from './bbmodelRasters'
import { readBbmodelResources } from './bbmodelResources'
import { planBbmodelSelection } from './bbmodelSelection'
import { readBbmodelSurfaceMetadata } from './bbmodelSurfaceMetadata'
import {
  assessBbmodelSurfaces,
  type BbmodelSurfaceOptions,
  readBbmodelSurfaceOptions,
} from './bbmodelSurfaces'
import { bindBbmodelTextures } from './bbmodelTextureBinding'
import { planBbmodelTextureLayouts } from './bbmodelTextureLayouts'
import {
  materializeBbmodelTextureMaterials,
  planBbmodelTextureMaterials,
} from './bbmodelTextureMaterials'
import { readBbmodelTransforms } from './bbmodelTransforms'
import { importDocumentBase } from './importDocumentBase'

const allowed = {
  normals: 'molda-flat',
  renderOrder: 'discard',
  seamLabels: 'discard',
  cubeShade: 'discard',
  outsideFrameUvs: 'clamp',
} as const satisfies BbmodelSurfaceOptions
const quadUv = { a: [0, 0], b: [16, 0], c: [16, 16], d: [0, 16] }
function fixture(
  cube: Record<string, unknown> = {},
  mesh: Record<string, unknown> = {},
  version: BbmodelVersion = '5.0',
  texture: Record<string, unknown> = {},
) {
  const bytes = new TextEncoder().encode(
      JSON.stringify({
        meta: { format_version: version, model_format: 'free' },
        elements: [
          {
            uuid: 'cube',
            type: 'cube',
            name: 'Caixa',
            from: [0, 0, 0],
            to: [2, 2, 2],
            faces: Object.fromEntries(
              BBMODEL_CUBE_DIRECTIONS.map((face) => [face, { uv: [0, 0, 16, 16], texture: false }]),
            ),
            ...cube,
          },
          {
            uuid: 'mesh',
            type: 'mesh',
            name: 'Asa',
            vertices: { a: [0, 0, 0], b: [2, 0, 0], c: [2, 2, 0], d: [0, 2, 2] },
            faces: { quad: { vertices: ['a', 'b', 'c', 'd'], texture: false, uv: quadUv } },
            ...mesh,
          },
        ],
        outliner: ['cube', 'mesh'],
        textures: [{ uuid: 'paint', ...texture }],
      }),
    ),
    envelope = readBbmodelEnvelope(bytes),
    graph = readBbmodelGraph(envelope),
    nodes = readBbmodelNodeMetadata(envelope, graph),
    metadata = readBbmodelSurfaceMetadata(nodes),
    source = readBbmodelGeometry(graph),
    selection = planBbmodelSelection(envelope, graph),
    plans = planBbmodelNativeGeometry(source, selection).plans,
    appearance = readBbmodelAppearance(envelope),
    uvs = convertBbmodelNativeUvs(
      source,
      plans,
      convertBbmodelFaceUvs(source, plans, appearance).geometries,
      bindBbmodelTextures(source, appearance),
      appearance,
    ).geometries,
    transforms = readBbmodelTransforms(graph, selection)
  return { bytes, appearance, graph, nodes, metadata, source, selection, plans, uvs, transforms }
}
function assess(input: ReturnType<typeof fixture>, options: BbmodelSurfaceOptions = {}) {
  return assessBbmodelSurfaces(input.metadata, input.plans, input.uvs, options)
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
] as const)('bbmodel %s reports native normals and proves the nonplanar quad change in real native geometry/GLB', async (version) => {
  const input = fixture({}, {}, version),
    before = structuredClone(input)
  failure(() => assess(input), 'unsupported', 'elements[0]')
  expect(assess(input, { normals: 'molda-flat' }).issues).toEqual([
    { code: 'native-flat-normals', node: 0, path: 'elements[0]', count: 6, source: 'cube' },
    { code: 'native-flat-normals', node: 1, path: 'elements[1]', count: 1, source: 'flat' },
  ])
  const positions = convertBbmodelPositions(input.source, input.plans, input.transforms).geometries,
    geometries = convertBbmodelGeometries(input.plans, positions, input.uvs, new Map()).geometries,
    materials = convertBbmodelNodeMaterials(input.metadata, input.plans, input.uvs, {
      untextured: 'uniform',
    }),
    hierarchy = convertBbmodelHierarchy(
      input.graph,
      input.nodes,
      input.selection,
      input.transforms,
      { geometries: input.plans, defaultMaterials: materials.byNode },
    ),
    document = {
      ...importDocumentBase({ id: 'surface', name: 'Asa torcida', createdAt: 1, updatedAt: 2 }),
      nodes: hierarchy.nodes,
      geometries,
      materials: materials.materials,
    },
    buffers = buildSceneGeometry(geometries[1]!)
  expect(readSceneDocument(document).status).toBe('valid')
  expect(Array.from(buffers.normals.slice(0, 3))).toEqual([0, 0, 1])
  // Analytic oracle for (2,2,0) × (0,2,2): (4,-4,4). Source flat quad uses
  // the first triangle's (0,0,1) on BOTH halves; native normals differ here.
  expect(Array.from(buffers.normals.slice(9, 12))).toEqual([
    Math.fround(1 / Math.sqrt(3)),
    Math.fround(-1 / Math.sqrt(3)),
    Math.fround(1 / Math.sqrt(3)),
  ])
  await expectValidGlb(encodeSceneGlb(document).bytes)
  expect(input).toEqual(before)
})

test('bbmodel smooth shading and inverted cubes require the native normals choice without coordinate repair', () => {
  const input = fixture({ from: [2, 0, 0], to: [0, 2, 2] }, { shading: 'smooth' }),
    before = structuredClone(input),
    positions = convertBbmodelPositions(input.source, input.plans, input.transforms, {
      nonPositiveCubes: 'preserve',
    })
  expect(positions.issues[0]).toEqual({
    code: 'inverted-cube-extents',
    node: 0,
    path: 'elements[0]',
    count: 1,
  })
  expect(
    assess(input, allowed).issues.map((issue) =>
      issue.code === 'native-flat-normals' ? issue.source : null,
    ),
  ).toEqual(['cube', 'smooth'])
  expect(input).toEqual(before)
  const empty = fixture(
    {
      faces: Object.fromEntries(
        BBMODEL_CUBE_DIRECTIONS.map((face) => [face, { uv: [0, 0, 16, 16], texture: null }]),
      ),
    },
    { faces: {}, shading: 'smooth' },
  )
  failure(() => assess(empty), 'unsupported', 'elements[1]')
  expect(assess(empty, allowed).issues).toEqual([
    { code: 'native-flat-normals', node: 1, path: 'elements[1]', count: 0, source: 'smooth' },
  ])
})

test('bbmodel source draw order, seam labels and shade metadata require distinct choices', () => {
  const cases: [Record<string, unknown>, Record<string, unknown>, string, string][] = [
    [{ shade: false }, {}, 'cubeShade', 'elements[0].shade'],
    [{}, { render_order: 'behind' }, 'renderOrder', 'elements[1].render_order'],
    [{}, { render_order: 'in_front' }, 'renderOrder', 'elements[1].render_order'],
    [
      {},
      {
        seams: Object.fromEntries([
          ['__proto__', 'join'],
          ['a_b_c', 'divide'],
        ]),
      },
      'seamLabels',
      'elements[1].seams',
    ],
  ]
  for (const [cube, mesh, option, path] of cases) {
    const input = fixture(cube, mesh),
      before = structuredClone(input)
    failure(() => assess(input, { ...allowed, [option]: 'reject' }), 'unsupported', path)
    const issues = assess(input, allowed).issues.filter(
      (issue) => issue.code !== 'native-flat-normals',
    )
    expect(issues).toHaveLength(1)
    expect(issues[0]!.path).toBe(path)
    if (option === 'seamLabels')
      expect(issues[0]).toEqual({
        code: 'seam-labels-discarded',
        node: 1,
        path,
        count: 2,
      })
    expect(input).toEqual(before)
  }
})

test('bbmodel unknown source labels cannot be approved by accepting all known adaptations', () => {
  for (const [mesh, path] of [
    [{ shading: 'plugin' }, 'elements[1].shading'],
    [{ render_order: 'plugin' }, 'elements[1].render_order'],
    [{ seams: { a_b: 'plugin' } }, 'elements[1].seams["a_b"]'],
  ] as const) {
    const input = fixture({}, mesh)
    poison(input.plans[0]!, 'faces')
    poison(input.uvs[0]!, 'faces')
    failure(() => assess(input, allowed), 'unsupported', path)
  }
})

test('bbmodel frame-clamp consent counts original textured corners once without modifying UV or reading XYZ', () => {
  const uv = { a: [-16, 0], b: [32, 0], c: [32, 16], d: [-16, 16] },
    input = fixture({}, { faces: { quad: { vertices: ['a', 'b', 'c', 'd'], texture: 0, uv } } }),
    before = structuredClone(input.uvs)
  for (const shape of input.source)
    for (const key of ['positions', 'from', 'to']) poison(shape, key)
  for (const info of input.metadata)
    for (const key of ['markerColor', 'name', 'source']) poison(info, key)
  failure(() => assess(input, { normals: 'molda-flat' }), 'unsupported', 'elements[1]')
  expect(assess(input, allowed).issues.at(-1)).toEqual({
    code: 'outside-frame-uv-clamped',
    node: 1,
    path: 'elements[1]',
    count: 4,
  })
  expect(input.plans[1]!.faces).toHaveLength(2)
  expect(input.uvs).toEqual(before)
  const plain = fixture(
    {},
    { faces: { quad: { vertices: ['a', 'b', 'c', 'd'], texture: false, uv } } },
  )
  for (const row of plain.uvs) for (const face of row.faces.values()) poison(face, 'corners')
  expect(assess(plain, { normals: 'molda-flat' }).issues).toHaveLength(2)
})

test('bbmodel surface-free default pieces need no visual consent and subsets do not read unrelated metadata', () => {
  const input = fixture(
    {
      faces: Object.fromEntries(
        BBMODEL_CUBE_DIRECTIONS.map((face) => [face, { uv: [0, 0, 16, 16], texture: null }]),
      ),
    },
    { faces: { edge: { vertices: ['a', 'b'], uv: {}, texture: null } } },
  )
  expect(assess(input)).toEqual({ issues: [] })
  poison(input.metadata, '1')
  expect(assessBbmodelSurfaces(input.metadata, [], [])).toEqual({ issues: [] })
  expect(
    assessBbmodelSurfaces(input.metadata, input.plans.slice(0, 1), input.uvs.slice(0, 1)),
  ).toEqual({ issues: [] })
})

test('bbmodel surface stages and count are checked before any first-node face read', () => {
  const input = fixture()
  poison(input.metadata, '0')
  poison(input.uvs, '0')
  failure(
    () =>
      assessBbmodelSurfaces(
        input.metadata,
        Array.from({ length: SCENE_LIMITS.geometries + 1 }, () => input.plans[0]!),
        input.uvs,
      ),
    'budget',
    'surfaces',
  )
  for (const kind of ['metadata', 'path', 'uv', 'identity'] as const) {
    const row = fixture()
    if (kind === 'metadata') row.metadata.pop()
    if (kind === 'path') row.metadata[1]!.sourcePath = 'wrong'
    if (kind === 'uv') row.uvs.pop()
    if (kind === 'identity') row.uvs[1]!.geometryId = 'wrong'
    poison(row.plans[0]!, 'faces')
    expect(() => assess(row, allowed)).toThrow('Mismatched bbmodel surface stages')
  }
  const missing = fixture()
  missing.uvs[0] = { ...missing.uvs[0]!, faces: new Map() }
  expect(() => assess(missing, allowed)).toThrow('Missing bbmodel surface face binding')
})

test('bbmodel frame-clamp choice reaches a cropped native flipbook sampler, not the whole source sheet', async () => {
  const topDown = Uint8Array.from([
      10, 0, 0, 255, 20, 0, 0, 255, 30, 0, 0, 255, 40, 0, 0, 255, 50, 0, 0, 255, 60, 0, 0, 255, 70,
      0, 0, 255, 80, 0, 0, 255,
    ]),
    input = fixture(
      {},
      {
        faces: {
          quad: {
            vertices: ['a', 'b', 'c', 'd'],
            texture: 0,
            uv: { a: [-2, 0], b: [4, 0], c: [4, 2], d: [-2, 2] },
          },
        },
      },
      '5.0',
      {
        name: 'Quadros',
        uv_width: 2,
        uv_height: 2,
        render_sides: 'front',
        source: `data:image/png;base64,${Buffer.from(encodePng(topDown, 2, 4)).toString('base64')}`,
      },
    ),
    before = structuredClone(input),
    surfaces = assess(input, allowed),
    resources = readBbmodelResources({
      bytes: input.bytes,
      entryPath: 'frames.bbmodel',
      version: '5.0',
      appearance: input.appearance,
      textureIndices: [0],
      files: [],
      sourcePreference: 'prefer-embedded',
    })
  if (resources.status !== 'ready') throw new Error('Embedded fixture expected')
  const decoded = decodeBbmodelRasters(resources),
    layouts = planBbmodelTextureLayouts(input.appearance, decoded, [0]),
    images = convertBbmodelImages(input.appearance, decoded, layouts.textures),
    planned = planBbmodelTextureMaterials(input.appearance, [0], { lighting: 'molda-standard' }),
    textured = materializeBbmodelTextureMaterials(planned.materials, images.byTexture),
    defaults = convertBbmodelNodeMaterials(input.metadata, input.plans, input.uvs, {
      untextured: 'uniform',
    }),
    positions = convertBbmodelPositions(input.source, input.plans, input.transforms),
    geometries = convertBbmodelGeometries(
      input.plans,
      positions.geometries,
      input.uvs,
      textured.byTexture,
    ),
    hierarchy = convertBbmodelHierarchy(
      input.graph,
      input.nodes,
      input.selection,
      input.transforms,
      { geometries: input.plans, defaultMaterials: defaults.byNode },
    ),
    document = {
      ...importDocumentBase({ id: 'frames', name: 'Quadros', createdAt: 1, updatedAt: 2 }),
      nodes: hierarchy.nodes,
      geometries: geometries.geometries,
      images: images.images,
      materials: [...defaults.materials, ...textured.materials],
    },
    renderer = new SceneRenderResource()
  expect(surfaces.issues.at(-1)).toEqual({
    code: 'outside-frame-uv-clamped',
    node: 1,
    path: 'elements[1]',
    count: 4,
  })
  expect(readSceneDocument(document).status).toBe('valid')
  try {
    renderer.update(document)
    const mesh = renderer.root.children.find(
      (row) => row instanceof Mesh && renderer.instanceFor(row)?.id === 'bbmodel_node_1',
    )
    if (!(mesh instanceof Mesh)) throw new Error('Native mesh expected')
    const material = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).find(
      (row) => row instanceof MeshStandardMaterial && row.map instanceof DataTexture,
    )
    if (!(material instanceof MeshStandardMaterial) || !(material.map instanceof DataTexture))
      throw new Error('Native bitmap material expected')
    const texture = material.map
    expect(texture.wrapS).toBe(ClampToEdgeWrapping)
    expect(texture.wrapT).toBe(ClampToEdgeWrapping)
    expect(texture.magFilter).toBe(NearestFilter)
    expect(texture.image.width).toBe(2)
    expect(texture.image.height).toBe(2)
    const red = () => {
      const pixels = texture.image.data
      if (!(pixels instanceof Uint8Array)) throw new Error('Native RGBA8 pixels expected')
      return Array.from(pixels).filter((_, i) => i % 4 === 0)
    }
    expect(red()).toEqual([30, 40, 10, 20])
    expect(renderer.setImageFrame('bbmodel_image_0', 1)).toBe(true)
    expect(material.map).toBe(texture)
    expect(red()).toEqual([70, 80, 50, 60])
    expect(texture.wrapS).toBe(ClampToEdgeWrapping)
    expect(texture.wrapT).toBe(ClampToEdgeWrapping)
  } finally {
    renderer.dispose()
  }
  expect(() => encodeSceneGlb(document)).toThrow(
    'Este GLB precisa converter ou deixar itens de fora',
  )
  const exported = encodeSceneGlb(document, { allowLosses: true })
  expect(exported.issues).toEqual([{ code: 'flipbook-first-frame', sourceId: 'bbmodel_image_0' }])
  await expectValidGlb(exported.bytes)
  expect(input).toEqual(before)
})

test('bbmodel surface options are closed and default to no unchosen adaptation', () => {
  expect(readBbmodelSurfaceOptions({})).toEqual({
    normals: 'reject',
    renderOrder: 'reject',
    seamLabels: 'reject',
    cubeShade: 'reject',
    outsideFrameUvs: 'reject',
  })
  expect(readBbmodelSurfaceOptions(allowed)).toEqual(allowed)
  for (const value of [null, [], true, 'all'])
    failure(() => readBbmodelSurfaceOptions(value as BbmodelSurfaceOptions), 'invalid', 'options')
  failure(
    () => readBbmodelSurfaceOptions({ unknown: true } as BbmodelSurfaceOptions),
    'invalid',
    'options.unknown',
  )
  for (const key of Object.keys(allowed))
    for (const value of [null, true, 0, 'auto', ''])
      failure(
        () => readBbmodelSurfaceOptions({ [key]: value } as BbmodelSurfaceOptions),
        'invalid',
        `options.${key}`,
      )
})
