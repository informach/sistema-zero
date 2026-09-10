import { expect, test } from 'bun:test'
import { GlbBinary } from '../export/GlbBinary'
import { encodeGlbContainer } from '../export/glbContainer'
import { encodeSceneGlb } from '../export/sceneGlb'
import { indexSceneDocument } from '../scene/documentIndex'
import { SCENE_LIMITS } from '../scene/limits'
import { readSceneDocument } from '../scene/readDocument'
import { expectValidGlb } from '../testing/gltfValidation'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { type GltfDocument, readGltfDocument } from './gltfDocument'
import { GltfInputError } from './gltfInput'
import { convertGltfDocument } from './gltfNativeDocument'

const identity = { id: 'gltf-import', name: 'Meu personagem', createdAt: 1, updatedAt: 2 }
const jsonBytes = (json: Record<string, unknown>) => new TextEncoder().encode(JSON.stringify(json))
function read(bytes: Uint8Array): GltfDocument {
  const result = readGltfDocument(bytes)
  if (result.status !== 'ready') throw new Error('Expected self-contained fixture')
  return result.document
}
function failure(run: () => unknown, reason: GltfInputError['reason'], path: string) {
  try {
    run()
    throw new Error('Expected an import error')
  } catch (error) {
    expect(error).toBeInstanceOf(GltfInputError)
    if (!(error instanceof GltfInputError)) throw error
    expect(error.reason).toBe(reason)
    expect(error.path).toBe(path)
  }
}
function forbidValues(source: GltfDocument) {
  for (const accessor of source.accessors)
    Object.defineProperty(accessor, 'values', {
      get(): Float64Array {
        throw new Error('Numeric values must not be read before this gate')
      },
    })
  for (const image of source.resources.images)
    Object.defineProperty(image, 'bytes', {
      get(): Uint8Array {
        throw new Error('Encoded image must not be read before this gate')
      },
    })
}
function triangleFixture(
  triangles = 1,
  instances = 1,
  options: {
    repeated?: boolean
    collinear?: boolean
    missingPosition?: boolean
    root?: Record<string, unknown>
    nodes?: Array<Record<string, unknown>>
  } = {},
) {
  const binary = new GlbBinary(),
    POSITION = binary.floats(
      new Float32Array(
        options.collinear ? [0, 0, 0, 1, 0, 0, 2, 0, 0] : [0, 0, 0, 1, 0, 0, 0, 1, 0],
      ),
      'VEC3',
      true,
      34962,
    ),
    TEXCOORD_0 = binary.floats(new Float32Array([0, 0, 1, 0, 0, 1]), 'VEC2', false, 34962),
    indices = binary.indices(
      Uint16Array.from({ length: triangles * 3 }, (_, i) =>
        options.repeated && i % 6 === 1 ? 0 : i % 3,
      ),
    ),
    image = binary.addView(new Uint8Array([1, 2, 3, 4]))
  return encodeGlbContainer(
    {
      asset: { version: '2.0' },
      buffers: [{ byteLength: binary.byteLength }],
      bufferViews: binary.views,
      accessors: binary.accessors,
      meshes: [
        {
          primitives: [
            {
              attributes: { ...(options.missingPosition ? {} : { POSITION }), TEXCOORD_0 },
              indices,
            },
          ],
        },
      ],
      nodes: options.nodes ?? Array.from({ length: instances }, () => ({ mesh: 0 })),
      // Intentionally undecodable and unused. A metadata preflight must never need it.
      images: [{ bufferView: image, mimeType: 'image/png' }],
      ...options.root,
    },
    binary.segments,
  )
}

test('assembles a textured animated GLB with native validation, exact costs and owned output', async () => {
  const bytes = encodeSceneGlb(makeSceneGlbFixture(3, 2, 4, 2), { allowLosses: true }).bytes,
    originalBytes = new Uint8Array(bytes),
    source = read(bytes),
    originalSource = structuredClone(source),
    result = convertGltfDocument(source, 0, identity),
    { document, report } = result,
    index = indexSceneDocument(document)
  await expectValidGlb(bytes)
  expect(readSceneDocument(document).status).toBe('valid')
  expect(document).toMatchObject({ ...identity, formatVersion: 2, kind: 'model' })
  expect(report.review).toBe('required')
  expect(report.costs).toEqual({
    nodes: 6,
    instances: 3,
    geometries: 1,
    vertices: index.vertexCount,
    looseEdges: 0,
    storedTriangles: 8,
    drawTriangles: 24,
    materials: 1,
    images: 1,
    pixelBytes: 16,
    skins: 0,
    weightedVertices: 0,
    clips: 1,
    tracks: 3,
    keys: 12,
  })
  expect(index.triangleCount).toBe(report.costs.drawTriangles)
  expect(document.animations![0]!.loop).toBe(false)
  expect(
    report.issues.some(
      (entry) => entry.stage === 'geometry' && entry.detail.code === 'flat-normals',
    ),
  ).toBe(true)
  expect(Bun.deepEquals(source, originalSource)).toBe(true)
  expect(bytes).toEqual(originalBytes)
  const again = convertGltfDocument(source, 0, identity)
  expect(Bun.deepEquals(result, again)).toBe(true)
  document.images[0]!.layers[0]!.pixels.fill(0)
  document.animations![0]!.tracks[0]!.keys[0]!.value[0] = 999
  document.nodes[0]!.name = 'Editado'
  report.issues.length = 0
  expect(Bun.deepEquals(source, originalSource)).toBe(true)
  expect(again.document.nodes[0]!.name).not.toBe('Editado')
  expect(again.document.images[0]!.layers[0]!.pixels.some(Boolean)).toBe(true)
  await expectValidGlb(encodeSceneGlb(again.document, { allowLosses: true }).bytes)
})

test('validates identity before source access and does not inherit thumbnail or unknown host fields', () => {
  const source = read(triangleFixture())
  forbidValues(source)
  for (const [key, value] of [
    ['id', 'bad/id'],
    ['name', ''],
    ['createdAt', NaN],
    ['updatedAt', Infinity],
  ] as const)
    failure(
      () => convertGltfDocument(source, null, { ...identity, [key]: value }),
      'invalid',
      `identity.${key}`,
    )
  const empty = read(jsonBytes({ asset: { version: '2.0' } })),
    hostIdentity = { ...identity, thumb: 'old', extra: true },
    result = convertGltfDocument(empty, null, hostIdentity)
  expect(Object.hasOwn(result.document, 'thumb')).toBe(false)
  expect(Object.hasOwn(result.document, 'extra')).toBe(false)
  expect(result.report.costs).toMatchObject({
    nodes: 0,
    instances: 0,
    geometries: 0,
    materials: 0,
    clips: 0,
  })
})

test('scene choice is explicit even with a default, and an empty selected scene reads no geometry or images', () => {
  const source = read(
    triangleFixture(1, 2, {
      root: {
        scenes: [{ nodes: [0] }, { nodes: [1] }, { name: 'Vazia' }],
        scene: 1,
      },
    }),
  )
  failure(() => convertGltfDocument(source, null, identity), 'invalid', 'scene')
  failure(() => convertGltfDocument(source, 3, identity), 'invalid', 'scene')
  const first = convertGltfDocument(source, 0, identity),
    second = convertGltfDocument(source, 1, identity)
  expect(first.document.nodes[0]!.id).toBe('gltf_node_0')
  expect(second.document.nodes[0]!.id).toBe('gltf_node_1')
  expect(first.report.source).toMatchObject({ sceneIndex: 0, omittedNodes: 1, omittedScenes: 2 })
  forbidValues(source)
  const empty = convertGltfDocument(source, 2, identity)
  expect(empty.document.nodes).toEqual([])
  expect(empty.report.source).toMatchObject({ sceneIndex: 2, omittedNodes: 2, omittedScenes: 2 })
  expect(empty.report.review).toBe('required')
})

test('draw budget charges shared geometry per instance and rejects excess before numeric or pixel reads', () => {
  const exact = convertGltfDocument(
    read(triangleFixture(SCENE_LIMITS.triangles / 2, 2)),
    null,
    identity,
  )
  expect(exact.document.geometries).toHaveLength(1)
  expect(exact.report.costs.storedTriangles).toBe(10_000)
  expect(exact.report.costs.drawTriangles).toBe(20_000)
  expect(indexSceneDocument(exact.document).triangleCount).toBe(20_000)
  const over = read(triangleFixture(SCENE_LIMITS.triangles / 2 + 1, 2))
  forbidValues(over)
  failure(() => convertGltfDocument(over, null, identity), 'budget', 'nodes[1].mesh')
  const storedOver = read(triangleFixture(SCENE_LIMITS.triangles + 1))
  forbidValues(storedOver)
  failure(
    () => convertGltfDocument(storedOver, null, identity),
    'budget',
    'meshes[0].primitives[0]',
  )
})

test('topology costs share the native policy for repeated indices, missing POSITION and undrawn faces', () => {
  const repeated = convertGltfDocument(
    read(triangleFixture(4, 3, { repeated: true })),
    null,
    identity,
  )
  expect(repeated.report.costs).toMatchObject({ storedTriangles: 2, drawTriangles: 6, vertices: 3 })
  expect(repeated.report.issues).toContainEqual({
    stage: 'geometry',
    detail: {
      code: 'repeated-indices-omitted',
      geometryId: 'gltf_geometry_0',
      path: 'meshes[0].primitives[0]',
      count: 2,
    },
  })
  const collinear = convertGltfDocument(
    read(triangleFixture(2, 3, { collinear: true })),
    null,
    identity,
  )
  expect(collinear.report.costs.drawTriangles).toBe(6)
  expect(indexSceneDocument(collinear.document).triangleCount).toBe(6)
  expect(
    collinear.report.issues.some((entry) => entry.detail.code === 'undrawn-degenerate-faces'),
  ).toBe(true)
  const missing = convertGltfDocument(
    read(triangleFixture(4, 3, { missingPosition: true })),
    null,
    identity,
  )
  expect(missing.report.costs).toMatchObject({ storedTriangles: 0, drawTriangles: 0, vertices: 0 })
  expect(missing.document.materials).toHaveLength(1)
  expect(missing.report.issues.some((entry) => entry.detail.code === 'missing-position')).toBe(true)
})

test('appearance and animation option gates run before geometry values or image decoding', () => {
  const source = read(
    triangleFixture(1, 1, {
      root: {
        textures: [{ source: 0 }],
        materials: [{ normalTexture: { index: 0, scale: 5 } }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0 }] }],
      },
    }),
  )
  forbidValues(source)
  failure(
    () => convertGltfDocument(source, null, identity),
    'unsupported',
    'materials[0].normalTexture.scale',
  )
  const ordinary = read(triangleFixture())
  forbidValues(ordinary)
  failure(
    () => convertGltfDocument(ordinary, null, identity, { animations: { fps: 121 } }),
    'invalid',
    'animation.fps',
  )
})

test('unused emissive/occlusion images are not decoded but their losses remain explicit', () => {
  const source = read(
    triangleFixture(1, 1, {
      root: {
        textures: [{ source: 0 }],
        materials: [
          {
            emissiveTexture: { index: 0 },
            emissiveFactor: [1, 1, 1],
            occlusionTexture: { index: 0 },
          },
        ],
        meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0 }] }],
      },
    }),
  )
  Object.defineProperty(source.resources.images[0]!, 'bytes', {
    get(): Uint8Array {
      throw new Error('Omitted image must not be decoded')
    },
  })
  const result = convertGltfDocument(source, null, identity)
  expect(result.document.images).toEqual([])
  expect(result.report.costs.pixelBytes).toBe(0)
  expect(
    result.report.issues
      .filter((entry) => entry.stage === 'materials')
      .map((entry) => entry.detail.code),
  ).toEqual(['name-generated', 'occlusion-omitted', 'emissive-omitted'])
})

test('report owns global optional extensions and unknown chunks without retaining arbitrary metadata or source objects', () => {
  const encoded = triangleFixture(1, 2, {
      root: {
        asset: { version: '2.0', generator: 'Example', copyright: 'Original author' },
        extensionsUsed: ['TEST_optional'],
        extensions: { TEST_optional: { value: 'inert' } },
        extras: { extensionsRequired: ['not-executed'], script: 'do not run' },
        nodes: [{ mesh: 0 }, { mesh: 0, extensions: { TEST_optional: { ignored: true } } }],
        scenes: [{ nodes: [0] }, { nodes: [1] }],
      },
    }),
    bytes = new Uint8Array(encoded.length + 12)
  bytes.set(encoded)
  const view = new DataView(bytes.buffer)
  view.setUint32(8, bytes.length, true)
  view.setUint32(encoded.length, 4, true)
  view.setUint32(encoded.length + 4, 0x12345678, true)
  const source = read(bytes),
    snapshot = structuredClone(source),
    result = convertGltfDocument(source, 0, identity)
  expect(result.report.source).toEqual({
    format: 'glb',
    sceneIndex: 0,
    omittedScenes: 1,
    omittedNodes: 1,
    originalFile: 'not-retained',
    auxiliaryMetadata: 'not-stored',
    unhandledExtensions: ['TEST_optional'],
    extensionOccurrences: [
      { name: 'TEST_optional', path: 'glTF.extensions.TEST_optional' },
      { name: 'TEST_optional', path: 'nodes[1].extensions.TEST_optional' },
    ],
    unknownChunkTypes: [0x12345678],
  })
  function objects(root: unknown) {
    const seen = new Set<object>(),
      queue = [root]
    while (queue.length) {
      const value = queue.pop()
      if (value === null || typeof value !== 'object' || seen.has(value)) continue
      seen.add(value)
      if (ArrayBuffer.isView(value)) queue.push(value.buffer)
      else if (value instanceof Map) for (const [key, entry] of value) queue.push(key, entry)
      else queue.push(...Object.values(value))
    }
    return seen
  }
  const sourceObjects = objects(source)
  expect([...objects(result)].some((value) => sourceObjects.has(value))).toBe(false)
  result.report.source.extensionOccurrences[0]!.path = 'edited'
  result.report.source.unhandledExtensions.length = 0
  result.report.source.unknownChunkTypes[0] = 0
  expect(Bun.deepEquals(source, snapshot)).toBe(true)
  expect(JSON.stringify(result)).not.toContain('do not run')
  expect(JSON.stringify(result)).not.toContain('Original author')
})

test('hierarchy overflow is classified before numeric reads; final bounds also reject finite worlds with overflowing points', () => {
  const source = read(
      triangleFixture(1, 1, {
        nodes: [
          { scale: [1e200, 1, 1], children: [1] },
          { mesh: 0, scale: [1e200, 1, 1] },
        ],
      }),
    ),
    snapshot = structuredClone(source)
  failure(() => convertGltfDocument(source, null, identity), 'unsupported', 'native.nodes')
  expect(Bun.deepEquals(source, snapshot)).toBe(true)
  forbidValues(source)
  failure(() => convertGltfDocument(source, null, identity), 'unsupported', 'native.nodes')
  const points = read(
    triangleFixture(1, 1, { collinear: true, nodes: [{ mesh: 0, scale: [1e308, 1, 1] }] }),
  )
  try {
    convertGltfDocument(points, null, identity)
    throw new Error('Expected native bounds rejection')
  } catch (error) {
    expect(error).toBeInstanceOf(GltfInputError)
    if (!(error instanceof GltfInputError)) throw error
    expect(error.reason).toBe('unsupported')
    expect(error.path.startsWith('native.')).toBe(true)
  }
})
