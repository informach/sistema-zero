import { expect, test } from 'bun:test'
import { encodeGlbContainer } from '../export/glbContainer'
import { encodeSceneGlb } from '../export/sceneGlb'
import { list, record } from '../scene/validation'
import { expectValidGlb } from '../testing/gltfValidation'
import { makeSceneAssistedSkinFixture } from '../testing/sceneAssistedSkin'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { prepareGltfAnimationChannel } from './gltfAnimationSample'
import { readGltfDocument } from './gltfDocument'
import { readGltfEnvelope } from './gltfEnvelope'
import { selectGltfScene } from './gltfGraph'
import { GltfInputError } from './gltfInput'
import { decodeGltfRasters } from './gltfRasters'

function bytes(json: Record<string, unknown>) {
  return new TextEncoder().encode(JSON.stringify({ asset: { version: '2.0' }, ...json }))
}
function ready(input: Uint8Array) {
  const result = readGltfDocument(input)
  if (result.status !== 'ready') throw new Error('Unexpected missing files')
  return result.document
}
function fails(run: () => unknown, reason: GltfInputError['reason'], path?: string) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  if (!(error instanceof GltfInputError)) throw new Error('Expected structured source error')
  expect(error.reason).toBe(reason)
  if (path !== undefined) expect(error.path).toBe(path)
}

test('one entry composes real animated/painted native exports without applying or duplicating the BIN', async () => {
  const source = makeSceneGlbFixture(2, 2, 3, 4),
    before = structuredClone(source),
    encoded = encodeSceneGlb(source, { allowLosses: true }).bytes,
    original = new Uint8Array(encoded)
  await expectValidGlb(encoded)
  const document = ready(encoded)
  expect(document.source.format).toBe('glb')
  expect(Object.hasOwn(document.source, 'bin')).toBe(false)
  expect(document.extensions).toEqual({ unhandled: [], occurrences: [] })
  expect(document.meshes.length).toBeGreaterThan(0)
  expect(document.appearance.materials.length).toBeGreaterThan(0)
  expect(document.resources.images.length).toBeGreaterThan(0)
  expect(document.animations.length).toBeGreaterThan(0)
  expect(document.skins).toEqual([])
  expect(document.skinWeights.layouts).toEqual([])
  const selected = selectGltfScene(document.graph, document.graph.defaultScene)
  expect(selected.length).toBeGreaterThan(0)
  const pixels = decodeGltfRasters(document.resources.images, [0])
  expect(pixels.rasters.length).toBe(1)
  expect(
    prepareGltfAnimationChannel(document.animations[0]!, 0, document.accessors)
      .sample(0.5)
      .every(Number.isFinite),
  ).toBe(true)
  expect(encoded).toEqual(original)
  expect(source).toEqual(before)
  const positions = new Float64Array(document.accessors[0]!.values)
  document.accessors[0]!.values.fill(123)
  document.resources.buffers[0]!.fill(99)
  document.source.json.asset = { version: 'broken' }
  expect(encoded).toEqual(original)
  expect(ready(encoded).accessors[0]!.values).toEqual(positions)
})

test('real assisted and mirrored exports compose graph, all bindings, influences and animations', async () => {
  for (const space of ['local', 'local-delta'] as const) {
    const { document: source } = makeSceneAssistedSkinFixture(space),
      encoded = encodeSceneGlb(source, { allowLosses: true }).bytes
    await expectValidGlb(encoded, Array(3).fill('NODE_SKINNED_MESH_NON_ROOT'))
    const document = ready(encoded)
    expect(document.skins.length).toBe(3)
    // Three bindings deliberately instance one shared mesh, not three copied meshes.
    expect(document.skinWeights.meshes.size).toBe(1)
    const bound = document.graph.nodes.filter((node) => node.skin !== null)
    expect(bound.length).toBe(3)
    expect(new Set(bound.map((node) => node.mesh))).toEqual(
      new Set(document.skinWeights.meshes.keys()),
    )
    expect(document.animations.length).toBeGreaterThan(0)
    for (const layout of document.skinWeights.layouts) {
      expect(layout.nonUnitVertices).toBe(0)
      expect(layout.unweightedVertices).toBe(0)
    }
    for (const clip of document.animations)
      for (let channel = 0; channel < clip.channels.length; channel++)
        expect(
          prepareGltfAnimationChannel(clip, channel, document.accessors)
            .sample(0.75)
            .every(Number.isFinite),
        ).toBe(true)
  }
})

test('missing resources return all exact paths and no partial document; retries keep ownership', () => {
  const input = bytes({
    buffers: [{ uri: 'data.bin', byteLength: 4 }],
    bufferViews: [{ buffer: 0, byteLength: 4 }],
    accessors: [{ bufferView: 0, type: 'SCALAR', componentType: 5126, count: 1 }],
    images: [{ uri: 'paint.png' }],
  })
  expect(readGltfDocument(input, [], 'bundle/model.gltf')).toEqual({
    status: 'missing',
    paths: ['bundle/data.bin', 'bundle/paint.png'],
  })
  const data = new Uint8Array(new Float32Array([7]).buffer),
    image = Uint8Array.of(1, 2, 3),
    files = [
      { path: 'bundle/data.bin', bytes: data },
      { path: 'bundle/paint.png', bytes: image },
    ]
  const result = readGltfDocument(input, files, 'bundle/model.gltf')
  if (result.status !== 'ready') throw new Error('Expected resolved source')
  expect(Array.from(result.document.accessors[0]!.values)).toEqual([7])
  expect(result.document.resources.resourceBytes).toBe(7)
  expect(result.document.resources.images[0]!.bytes).toEqual(image)
  // Source staging does not claim these invalid image bytes have been decoded or validated.
  fails(() => decodeGltfRasters(result.document.resources.images, [0]), 'unsupported')
  data.fill(0)
  image.fill(0)
  expect(Array.from(result.document.accessors[0]!.values)).toEqual([7])
  expect(Array.from(result.document.resources.images[0]!.bytes)).toEqual([1, 2, 3])
  expect(readGltfDocument(input, files.slice(0, 1), 'bundle/model.gltf')).toEqual({
    status: 'missing',
    paths: ['bundle/paint.png'],
  })
})

test('optional extensions/extras remain inert and required support is decided before resource access', () => {
  const input = bytes({
    extensionsUsed: ['VENDOR_note'],
    nodes: [
      { extensions: { VENDOR_note: { url: 'https://never-fetch.invalid/', data: [1, 2, 3] } } },
    ],
    extras: { extensions: { not_a_gltf_extension: 'do not execute' } },
  })
  const document = ready(input)
  expect(document.extensions).toEqual({
    unhandled: ['VENDOR_note'],
    occurrences: [{ name: 'VENDOR_note', path: 'nodes[0].extensions.VENDOR_note' }],
  })
  expect(document.source.json.extras).toEqual({
    extensions: { not_a_gltf_extension: 'do not execute' },
  })
  const required = bytes({
    extensionsUsed: ['VENDOR_required'],
    extensionsRequired: ['VENDOR_required'],
    buffers: [{ uri: 'data.bin', byteLength: 4 }],
  })
  fails(
    () =>
      readGltfDocument(required, [
        {
          path: 'data.bin',
          get bytes(): Uint8Array {
            throw new Error('Required gate precedes files')
          },
        },
      ]),
    'unsupported',
    'extensionsRequired[0]',
  )
  fails(
    () => ready(bytes({ nodes: [{ extensions: { VENDOR_undeclared: {} } }] })),
    'invalid',
    'nodes[0].extensions',
  )
  const proto = new TextEncoder().encode(
    '{"asset":{"version":"2.0"},"extensionsUsed":["__proto__"],"extensions":{"__proto__":{"injected":true}}}',
  )
  expect(ready(proto).extensions.occurrences).toEqual([
    { name: '__proto__', path: 'glTF.extensions.__proto__' },
  ])
  expect(Object.hasOwn({}, 'injected')).toBe(false)
})

test('cameras and material UV dependencies are validated, not merely counted', () => {
  const camera = { type: 'perspective', perspective: { yfov: 0.75, znear: 0.25 } }
  expect(ready(bytes({ cameras: [camera], nodes: [{ camera: 0 }] })).graph.nodes[0]!.camera).toBe(0)
  fails(
    () => ready(bytes({ cameras: [{ type: 'perspective' }], nodes: [{ camera: 0 }] })),
    'invalid',
    'cameras[0].perspective',
  )
  fails(
    () => ready(bytes({ cameras: [camera], nodes: [{ camera: 1 }] })),
    'invalid',
    'nodes[0].camera',
  )
  const input = bytes({
    accessors: [{ type: 'VEC3', componentType: 5126, count: 1, min: [0, 0, 0], max: [0, 0, 0] }],
    meshes: [{ primitives: [{ mode: 0, attributes: { POSITION: 0 }, material: 0 }] }],
    textures: [{}],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0, texCoord: 1 } } }],
  })
  fails(() => ready(input), 'invalid', 'meshes[0].primitives[0].attributes.TEXCOORD_1')
})

test('numeric image roles and animation domains cannot be bypassed through the composed entry', () => {
  const mixed = encodeGlbContainer(
    {
      asset: { version: '2.0' },
      buffers: [{ byteLength: 4 }],
      bufferViews: [{ buffer: 0, byteLength: 4 }],
      accessors: [{ bufferView: 0, type: 'SCALAR', componentType: 5126, count: 1 }],
      images: [{ bufferView: 0, mimeType: 'image/png' }],
    },
    [new Uint8Array(4)],
  )
  fails(() => ready(mixed), 'invalid', 'images[0].bufferView')
  const native = encodeSceneGlb(makeSceneGlbFixture(1, 1, 3, 2), { allowLosses: true }).bytes,
    document = ready(native),
    sampler = document.animations[0]!.samplers[0]!,
    accessor = document.accessors[sampler.input]!,
    envelope = readGltfEnvelope(native)
  if (!accessor.layout || !envelope.bin) throw new Error('Expected packed time accessor')
  const view = document.resources.views[accessor.layout.bufferView]!,
    raw = new DataView(envelope.bin.buffer, envelope.bin.byteOffset, envelope.bin.byteLength)
  for (let i = 0; i < accessor.count; i++)
    raw.setFloat32(view.byteOffset + accessor.layout.byteOffset + i * 4, 0, true)
  const accessorJson = record(
    list(envelope.json.accessors, 'accessors', 65536)[sampler.input],
    'accessor',
  )
  accessorJson.min = [0]
  accessorJson.max = [0]
  fails(
    () => ready(encodeGlbContainer(envelope.json, [envelope.bin!])),
    'invalid',
    'animations[0].samplers[0].input',
  )
})

test('empty libraries and multiple scenes remain explicit without automatic scene merging', () => {
  const empty = ready(bytes({ extras: { source: 'empty library' } }))
  expect(empty.graph.scenes).toEqual([])
  expect(empty.graph.defaultScene).toBeNull()
  expect(empty.accessors).toEqual([])
  expect(empty.resources.resourceBytes).toBe(0)
  const document = ready(
    bytes({ nodes: [{ name: 'One' }, { name: 'Two' }], scenes: [{ nodes: [0] }, { nodes: [1] }] }),
  )
  expect(document.graph.defaultScene).toBeNull()
  fails(() => selectGltfScene(document.graph, null), 'invalid', 'scene')
  expect(selectGltfScene(document.graph, 1)).toEqual([1])
})

test('the composed entry validates actual skin weight values rather than only accessor formats', () => {
  const { document: source } = makeSceneAssistedSkinFixture('local'),
    encoded = encodeSceneGlb(source, { allowLosses: true }).bytes,
    document = ready(encoded),
    meshIndex = [...document.skinWeights.meshes.keys()][0]!,
    weightIndex = document.meshes[meshIndex]!.primitives[0]!.attributes.get('WEIGHTS_0')
  if (weightIndex === undefined) throw new Error('Expected skin weights')
  const accessor = document.accessors[weightIndex]!,
    envelope = readGltfEnvelope(encoded),
    bin = envelope.bin
  if (!accessor.layout || accessor.componentType !== 5126 || !bin)
    throw new Error('Expected packed Float32 weights')
  const view = document.resources.views[accessor.layout.bufferView]!
  new DataView(bin.buffer, bin.byteOffset, bin.byteLength).setFloat32(
    view.byteOffset + accessor.layout.byteOffset,
    -1,
    true,
  )
  fails(
    () => ready(encodeGlbContainer(envelope.json, [bin])),
    'invalid',
    `meshes[${meshIndex}].primitives[0].attributes.WEIGHTS_0`,
  )
})
