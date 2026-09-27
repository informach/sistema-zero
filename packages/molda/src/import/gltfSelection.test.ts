import { expect, test } from 'bun:test'
import { encodeGlbContainer } from '../export/glbContainer'
import { encodeSceneGlb } from '../export/sceneGlb'
import { SCENE_LIMITS } from '../scene/limits'
import { expectValidGlb } from '../testing/gltfValidation'
import { makeSceneAssistedSkinFixture } from '../testing/sceneAssistedSkin'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { readGltfDocument } from './gltfDocument'
import { convertGltfGeometries } from './gltfGeometries'
import { GltfInputError } from './gltfInput'
import { decodeGltfRasters } from './gltfRasters'
import { selectGltfDocument } from './gltfSelection'

function ready(bytes: Uint8Array) {
  const result = readGltfDocument(bytes)
  if (result.status !== 'ready') throw new Error('Unexpected missing resources')
  return result.document
}
function source(json: Record<string, unknown>) {
  return ready(new TextEncoder().encode(JSON.stringify({ asset: { version: '2.0' }, ...json })))
}
function triangle() {
  return {
    accessors: [
      { type: 'VEC3', componentType: 5126, count: 3, min: [0, 0, 0], max: [0, 0, 0] },
      { type: 'VEC2', componentType: 5126, count: 3 },
      { type: 'VEC3', componentType: 5126, count: 3, min: [0, 0, 0], max: [0, 0, 0] },
    ],
    meshes: [
      { primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, targets: [{ POSITION: 2 }] }] },
    ],
  }
}
function fails(run: () => unknown, reason: GltfInputError['reason'] = 'invalid') {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  if (!(error instanceof GltfInputError)) throw new Error('Expected a structured input error')
  expect(error.reason).toBe(reason)
}

test('explicit scene selection preserves authored order, empty scenes and libraries without merging', () => {
  const document = source({
      nodes: [{ children: [3, 2] }, {}, {}, { children: [4] }, {}, {}],
      scenes: [{ nodes: [1, 0] }, { nodes: [5, 0] }, {}],
      scene: 1,
    }),
    before = structuredClone(document)
  const first = selectGltfDocument(document, 0)
  expect(first.roots).toEqual([1, 0])
  expect(first.nodes).toEqual([1, 0, 3, 2, 4])
  expect(selectGltfDocument(document, 1).nodes).toEqual([5, 0, 3, 2, 4])
  expect(selectGltfDocument(document, 2).nodes).toEqual([])
  expect(first.instances).toEqual([])
  expect(first.variants).toEqual([])
  expect(first.defaultMaterial).toBe(false)
  for (const indices of Object.values(first.dependencies)) expect(indices).toEqual([])
  for (const index of [null, -1, 3, 0.5, Number.NaN])
    fails(() => selectGltfDocument(document, index))
  first.nodes.reverse()
  first.roots.fill(99)
  expect(document).toEqual(before)
  const library = source({ nodes: [{ children: [1] }, {}, {}] })
  expect(selectGltfDocument(library, null).nodes).toEqual([0, 2, 1])
  fails(() => selectGltfDocument(library, 0))
  expect(selectGltfDocument(source({}), null).nodes).toEqual([])
})

test('instances share only exact base morph variants, retaining signed zero and mesh identity', () => {
  const shape = triangle(),
    document = source({
      ...shape,
      meshes: [shape.meshes[0], shape.meshes[0]],
      nodes: [
        { mesh: 0 },
        { mesh: 0, weights: [0] },
        { mesh: 0, weights: [0] },
        { mesh: 0, weights: [1e-200] },
        { mesh: 0, weights: [1e200] },
        { mesh: 0, weights: [1e-200] },
        { mesh: 1 },
      ],
    })
  // JSON.stringify loses -0; the validated source representation can preserve a literal -0.
  document.graph.nodes[2]!.weights = [-0]
  const before = structuredClone(document),
    result = selectGltfDocument(document, null)
  expect(result.instances.map((instance) => instance.variant)).toEqual([0, 0, 1, 2, 3, 2, 4])
  expect(result.variants.map((variant) => variant.meshIndex)).toEqual([0, 0, 0, 0, 1])
  expect(result.variants.map((variant) => variant.weights)).toEqual([
    [0],
    [-0],
    [1e-200],
    [1e200],
    [0],
  ])
  expect(Object.is(result.variants[1]!.weights[0], -0)).toBe(true)
  expect(result.dependencies.meshes).toEqual([0, 1])
  expect(result.dependencies.accessors).toEqual([0, 1, 2])
  expect(result.defaultMaterial).toBe(true)
  result.variants[0]!.weights[0] = 5
  result.instances[0]!.node = 99
  result.dependencies.accessors.fill(99)
  expect(document).toEqual(before)
  expect(selectGltfDocument(document, null).variants[0]!.weights).toEqual([0])
})

test('all five material maps are dependencies, even at zero strength; unrelated resources stay out', () => {
  const shape = triangle(),
    primitive = shape.meshes[0]!.primitives[0]!,
    document = source({
      ...shape,
      meshes: [
        { primitives: [{ ...primitive, material: 1 }, primitive] },
        { primitives: [{ ...primitive, material: 0 }] },
      ],
      materials: [
        { pbrMetallicRoughness: { baseColorTexture: { index: 5 } } },
        {
          pbrMetallicRoughness: {
            baseColorTexture: { index: 0 },
            metallicRoughnessTexture: { index: 1 },
          },
          normalTexture: { index: 2, scale: 0 },
          occlusionTexture: { index: 3, strength: 0 },
          emissiveTexture: { index: 4 },
          emissiveFactor: [0, 0, 0],
        },
      ],
      textures: [
        { source: 0, sampler: 1 },
        { source: 0 },
        { source: 1, sampler: 0 },
        { source: 2, sampler: 1 },
        {},
        { source: 3, sampler: 2 },
      ],
      samplers: [{}, {}, {}],
      images: Array.from({ length: 4 }, (_, i) => ({ uri: `data:image/png;base64,A${i}==` })),
      cameras: [
        { type: 'orthographic', orthographic: { xmag: 1, ymag: 1, znear: 0, zfar: 10 } },
        { type: 'perspective', perspective: { yfov: 1, znear: 0.1 } },
      ],
      nodes: [
        { mesh: 0, camera: 1 },
        { mesh: 0, camera: 1 },
        { mesh: 1, camera: 0 },
      ],
      scenes: [{ nodes: [1, 0] }, { nodes: [2] }],
      extensionsUsed: ['VENDOR_unhandled'],
      extensions: { VENDOR_unhandled: {} },
    })
  // Valid resource envelopes deliberately contain invalid pixels. Selection must not decode them.
  const result = selectGltfDocument(document, 0)
  expect(result.dependencies.materials).toEqual([1])
  expect(result.dependencies.textures).toEqual([0, 1, 2, 3, 4])
  expect(result.dependencies.samplers).toEqual([0, 1])
  expect(result.dependencies.images).toEqual([0, 1, 2])
  expect(result.dependencies.cameras).toEqual([1])
  expect(result.texturesWithoutImages).toEqual([4])
  expect(result.unhandledExtensions).toEqual(['VENDOR_unhandled'])
  expect(result.defaultMaterial).toBe(true)
  result.unhandledExtensions.length = 0
  expect(document.extensions.unhandled).toEqual(['VENDOR_unhandled'])
  expect(selectGltfDocument(document, 1).dependencies.images).toEqual([3])
})

test('every animation channel is classified without pulling nodes from other scenes or resolving extensions', () => {
  const document = source({
    accessors: [
      { type: 'SCALAR', componentType: 5126, count: 1, min: [0], max: [0] },
      { type: 'VEC3', componentType: 5126, count: 1 },
      { type: 'VEC3', componentType: 5126, count: 1 },
    ],
    nodes: [{}, {}],
    scenes: [{ nodes: [0] }, { nodes: [1] }, {}],
    animations: [
      {
        samplers: [
          { input: 0, output: 1 },
          { input: 0, output: 2 },
        ],
        channels: [
          { sampler: 0, target: { node: 0, path: 'translation' } },
          { sampler: 1, target: { node: 1, path: 'translation' } },
          { sampler: 0, target: { node: 0, path: 'scale' } },
          { sampler: 1, target: { path: 'translation' } },
          { sampler: 1, target: { node: 0, path: 'vendor' } },
          { sampler: 1, target: { node: 1, path: 'vendor' } },
        ],
      },
      {
        samplers: [{ input: 0, output: 2 }],
        channels: [{ sampler: 0, target: { node: 1, path: 'scale' } }],
      },
    ],
  })
  const result = selectGltfDocument(document, 0)
  expect(result.nodes).toEqual([0])
  expect(result.animations).toEqual([
    {
      animation: 0,
      channels: [0, 2],
      samplers: [0],
      outsideSceneChannels: [1, 5],
      unresolvedChannels: [3, 4],
    },
    { animation: 1, channels: [], samplers: [], outsideSceneChannels: [0], unresolvedChannels: [] },
  ])
  expect(result.dependencies.accessors).toEqual([0, 1])
  const other = selectGltfDocument(document, 1)
  expect(other.dependencies.accessors).toEqual([0, 2])
  expect(other.animations[0]!.unresolvedChannels).toEqual([3, 5])
  const empty = selectGltfDocument(document, 2)
  expect(empty.dependencies.accessors).toEqual([])
  expect(empty.animations[0]!.unresolvedChannels).toEqual([3])
  for (const selection of [result, other, empty])
    for (const clip of selection.animations) {
      const partition = [...clip.channels, ...clip.outsideSceneChannels, ...clip.unresolvedChannels]
      expect(partition.sort((a, b) => a - b)).toEqual(
        document.animations[clip.animation]!.channels.map((_, i) => i),
      )
    }
  result.animations[0]!.channels.fill(99)
  expect(selectGltfDocument(document, 0).animations[0]!.channels).toEqual([0, 2])
})

test('dependency closure includes sparse views and image views but not unrelated buffers', () => {
  const bytes = encodeGlbContainer(
    {
      asset: { version: '2.0' },
      buffers: [
        { byteLength: 20 },
        { uri: 'data:application/octet-stream;base64,AAAAAA==', byteLength: 4 },
      ],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: 1 },
        { buffer: 0, byteOffset: 4, byteLength: 12 },
        { buffer: 0, byteOffset: 16, byteLength: 4 },
        { buffer: 1, byteLength: 4 },
      ],
      accessors: [
        {
          type: 'VEC3',
          componentType: 5126,
          count: 1,
          min: [0, 0, 0],
          max: [0, 0, 0],
          sparse: {
            count: 1,
            indices: { bufferView: 0, componentType: 5121 },
            values: { bufferView: 1 },
          },
        },
        { type: 'VEC2', componentType: 5126, count: 1 },
        { type: 'SCALAR', componentType: 5126, count: 1, bufferView: 3 },
      ],
      images: [{ bufferView: 2, mimeType: 'image/png' }],
      textures: [{ source: 0 }],
      materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
      meshes: [
        { primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, mode: 0, material: 0 }] },
      ],
      nodes: [{ mesh: 0 }],
      scenes: [{ nodes: [0] }],
    },
    [new Uint8Array(20)],
  )
  const document = ready(bytes),
    result = selectGltfDocument(document, 0)
  expect(result.dependencies.accessors).toEqual([0, 1])
  expect(result.dependencies.views).toEqual([0, 1, 2])
  expect(result.dependencies.buffers).toEqual([0])
  expect(result.dependencies.images).toEqual([0])
  expect(document.resources.buffers.length).toBe(2)
})

test('node and instance preflights reject excess before reading mesh data or pixels', () => {
  const shape = triangle(),
    document = source({
      ...shape,
      nodes: Array.from({ length: SCENE_LIMITS.renderedParts + 1 }, () => ({ mesh: 0 })),
      scenes: [
        { nodes: Array.from({ length: SCENE_LIMITS.renderedParts }, (_, i) => i) },
        { nodes: Array.from({ length: SCENE_LIMITS.renderedParts + 1 }, (_, i) => i) },
      ],
    })
  const exact = selectGltfDocument(document, 0)
  expect(exact.instances.length).toBe(SCENE_LIMITS.renderedParts)
  expect(exact.variants.length).toBe(1)
  const guarded = {
    ...document,
    get meshes(): typeof document.meshes {
      throw new Error('Geometry touched before preflight')
    },
  }
  fails(() => selectGltfDocument(guarded, 1), 'budget')
  const graph = source({
    nodes: Array.from({ length: SCENE_LIMITS.nodes + 1 }, () => ({})),
    scenes: [
      { nodes: Array.from({ length: SCENE_LIMITS.nodes }, (_, i) => i) },
      { nodes: Array.from({ length: SCENE_LIMITS.nodes + 1 }, (_, i) => i) },
    ],
  })
  expect(selectGltfDocument(graph, 0).nodes.length).toBe(SCENE_LIMITS.nodes)
  fails(() => selectGltfDocument(graph, 1), 'budget')
})

test('real exported scenes feed geometry and raster conversion using only selected dependencies', async () => {
  const native = makeSceneGlbFixture(4, 2, 3, 4),
    before = structuredClone(native),
    bytes = encodeSceneGlb(native, { allowLosses: true }).bytes
  await expectValidGlb(bytes)
  const document = ready(bytes),
    selection = selectGltfDocument(document, document.graph.defaultScene),
    converted = convertGltfGeometries(
      document.meshes,
      document.accessors,
      selection.variants.map((variant, i) => ({ ...variant, geometryId: `shape_${i}` })),
      {
        ids: new Map(document.appearance.materials.map((_, i) => [i, `material_${i}`])),
        defaultId: 'default',
      },
    ),
    pixels = decodeGltfRasters(document.resources.images, selection.dependencies.images)
  expect(selection.instances.length).toBe(4)
  expect(selection.variants.length).toBe(1)
  expect(converted.geometries.length).toBe(1)
  expect(pixels.rasters.length).toBe(1)
  expect(selection.animations[0]!.channels.length).toBe(4)
  expect(selection.animations[0]!.outsideSceneChannels).toEqual([])
  expect(selection.animations[0]!.unresolvedChannels).toEqual([])
  expect(native).toEqual(before)
})

test('selection never opens accessor values, buffer bytes or raster bytes already owned by the source', () => {
  const document = ready(
      encodeSceneGlb(makeSceneGlbFixture(2, 2, 3, 4), { allowLosses: true }).bytes,
    ),
    expected = selectGltfDocument(document, document.graph.defaultScene)
  for (const accessor of document.accessors)
    Object.defineProperty(accessor, 'values', {
      get() {
        throw new Error('Numeric values accessed')
      },
    })
  for (const field of ['buffers', 'images'])
    Object.defineProperty(document.resources, field, {
      get() {
        throw new Error('Resource bytes accessed')
      },
    })
  expect(selectGltfDocument(document, document.graph.defaultScene)).toEqual(expected)
})

test('assisted and mirrored GLBs retain every bound skin and joint without duplicating shared geometry', async () => {
  for (const space of ['local', 'local-delta'] as const) {
    const { document: native } = makeSceneAssistedSkinFixture(space),
      bytes = encodeSceneGlb(native, { allowLosses: true }).bytes
    await expectValidGlb(bytes, Array(3).fill('NODE_SKINNED_MESH_NON_ROOT'))
    const document = ready(bytes),
      selection = selectGltfDocument(document, document.graph.defaultScene)
    expect(selection.dependencies.skins).toEqual([0, 1, 2])
    expect(selection.instances.filter((instance) => instance.skin !== null).length).toBe(3)
    expect(selection.variants.length).toBe(1)
    for (const index of selection.dependencies.skins) {
      const skin = document.skins[index]!
      for (const joint of skin.joints) expect(selection.nodes).toContain(joint)
      if (skin.skeleton !== null) expect(selection.nodes).toContain(skin.skeleton)
      if (skin.inverseBindMatrices !== null)
        expect(selection.dependencies.accessors).toContain(skin.inverseBindMatrices)
    }
    expect(
      selection.animations.every(
        (clip) => clip.outsideSceneChannels.length === 0 && clip.unresolvedChannels.length === 0,
      ),
    ).toBe(true)
  }
})
