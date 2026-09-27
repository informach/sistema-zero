import { expect, test } from 'bun:test'
import { DoubleSide, MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { encodeSceneGlb } from '../export/sceneGlb'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { readGltfAccessors } from './gltfAccessors'
import { readGltfAppearance } from './gltfAppearance'
import { readGltfBuffers } from './gltfBuffers'
import { readGltfBufferViews } from './gltfBufferViews'
import { readGltfEnvelope } from './gltfEnvelope'
import { readGltfImages } from './gltfImages'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'
import { readGltfMaterials, validateGltfMaterialUvs } from './gltfMaterials'
import { type GltfMesh, readGltfMeshes } from './gltfMeshes'
import { readGltfSamplers, readGltfTextures } from './gltfTextures'

function failure(run: () => unknown, reason: GltfInputError['reason'] = 'invalid') {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  expect((error as GltfInputError).reason).toBe(reason)
}
function mesh(material: number | null, uvSets: number[]): GltfMesh {
  const attributes = new Map<string, number>([['POSITION', 0]])
  for (const set of uvSets) attributes.set(`TEXCOORD_${set}`, 1)
  return {
    name: null,
    weights: [],
    primitives: [
      {
        attributes,
        material,
        mode: 0,
        targets: [],
        indicesAccessor: null,
        topology: { kind: 'points', indices: Uint32Array.of(0) },
      },
    ],
  }
}

test('retains glTF PBR defaults, exact factors and owned vectors rather than applying native defaults', () => {
  expect(readGltfAppearance({}, [], [])).toEqual({
    images: [],
    samplers: [],
    textures: [],
    materials: [],
  })
  const defaults = readGltfMaterials([{}, {}], 0)
  expect(defaults[0]).toEqual({
    name: null,
    baseColorFactor: [1, 1, 1, 1],
    metallicFactor: 1,
    roughnessFactor: 1,
    baseColorTexture: null,
    metallicRoughnessTexture: null,
    normalTexture: null,
    occlusionTexture: null,
    emissiveTexture: null,
    emissiveFactor: [0, 0, 0],
    alphaMode: 'OPAQUE',
    alphaCutoff: 0.5,
    doubleSided: false,
  })
  defaults[0]!.baseColorFactor[0] = 0
  expect(defaults[1]!.baseColorFactor[0]).toBe(1)
  const input = [
    {
      name: '',
      pbrMetallicRoughness: {
        baseColorFactor: [0.1234567890123, 0.5, Number.MIN_VALUE, 0],
        metallicFactor: 0.9876543210123,
        roughnessFactor: 0,
      },
      emissiveFactor: [0.5, 0.25, 0.125],
      alphaMode: 'OPAQUE',
      alphaCutoff: 2.5,
      doubleSided: true,
    },
  ]
  const before = structuredClone(input),
    material = readGltfMaterials(input, 0)[0]!
  expect(Array.from(material.baseColorFactor)).toEqual(
    input[0]!.pbrMetallicRoughness.baseColorFactor,
  )
  expect(material.metallicFactor).toBe(0.9876543210123)
  expect(material.roughnessFactor).toBe(0)
  expect(material.alphaMode).toBe('OPAQUE')
  expect(material.alphaCutoff).toBe(2.5)
  material.baseColorFactor[0] = 1
  material.emissiveFactor[0] = 1
  expect(input).toEqual(before)
})

test('reads every texture channel with independent UV references and exact normal/occlusion parameters', () => {
  const info = { index: 1, texCoord: 3 }
  const input = [
    {
      pbrMetallicRoughness: { baseColorTexture: info, metallicRoughnessTexture: { index: 0 } },
      normalTexture: { ...info, scale: -2.125 },
      occlusionTexture: { ...info, strength: 0.1234567890123 },
      emissiveTexture: info,
      alphaMode: 'MASK',
      alphaCutoff: 0,
    },
  ]
  const before = structuredClone(input),
    material = readGltfMaterials(input, 2)[0]!
  expect(material.baseColorTexture).toEqual(info)
  expect(material.metallicRoughnessTexture).toEqual({ index: 0, texCoord: 0 })
  expect(material.normalTexture).toEqual({ ...info, scale: -2.125 })
  expect(material.occlusionTexture).toEqual({ ...info, strength: 0.1234567890123 })
  expect(material.emissiveTexture).toEqual(info)
  expect(material.alphaMode).toBe('MASK')
  expect(material.alphaCutoff).toBe(0)
  material.baseColorTexture!.index = 0
  expect(material.emissiveTexture!.index).toBe(1)
  expect(input).toEqual(before)
  const defaults = readGltfMaterials(
    [{ normalTexture: { index: 0 }, occlusionTexture: { index: 0 }, alphaMode: 'BLEND' }],
    1,
  )[0]!
  expect(defaults.normalTexture).toEqual({ index: 0, texCoord: 0, scale: 1 })
  expect(defaults.occlusionTexture).toEqual({ index: 0, texCoord: 0, strength: 1 })
  expect(defaults.alphaMode).toBe('BLEND')
})

test('rejects invalid PBR factors, alpha state, booleans and malformed optional fields without clamping', () => {
  for (const input of [null, [], [null], [{ pbrMetallicRoughness: null }], [{ name: 1 }]])
    failure(() => readGltfMaterials(input, 1))
  for (const factor of [-0.01, 1.01, Infinity, NaN, null, '1']) {
    for (const field of ['metallicFactor', 'roughnessFactor'])
      failure(() => readGltfMaterials([{ pbrMetallicRoughness: { [field]: factor } }], 1))
    failure(() =>
      readGltfMaterials([{ pbrMetallicRoughness: { baseColorFactor: [factor, 0, 0, 1] } }], 1),
    )
    failure(() => readGltfMaterials([{ emissiveFactor: [0, factor, 0] }], 1))
    failure(() => readGltfMaterials([{ occlusionTexture: { index: 0, strength: factor } }], 1))
  }
  for (const row of [
    { alphaMode: null },
    { alphaMode: 'blend' },
    { alphaMode: 'UNKNOWN' },
    { alphaCutoff: 0.25 },
    { alphaMode: 'MASK', alphaCutoff: -1 },
    { alphaMode: 'MASK', alphaCutoff: Infinity },
    { doubleSided: 1 },
    { doubleSided: null },
    { emissiveFactor: [0, 0] },
    { emissiveFactor: Array<number>(3) },
    { normalTexture: { index: 0, scale: null } },
    { normalTexture: { index: 0, scale: Infinity } },
  ])
    failure(() => readGltfMaterials([row], 1))
})

test('requires existing texture indices and exact nonnegative UV indices for all texture-info forms', () => {
  for (const value of [
    null,
    {},
    { index: -1 },
    { index: 1 },
    { index: null },
    { index: '0' },
    { index: 0, texCoord: -1 },
    { index: 0, texCoord: null },
    { index: 0, texCoord: 0.5 },
  ]) {
    for (const field of ['baseColorTexture', 'metallicRoughnessTexture'])
      failure(() => readGltfMaterials([{ pbrMetallicRoughness: { [field]: value } }], 1))
    for (const field of ['normalTexture', 'occlusionTexture', 'emissiveTexture'])
      failure(() => readGltfMaterials([{ [field]: value }], 1))
  }
})

test('samplers preserve all filter/wrap modes and distinguish undeclared auto filtering', () => {
  expect(readGltfSamplers([{}])[0]).toEqual({
    name: null,
    magFilter: null,
    minFilter: null,
    wrapS: 10497,
    wrapT: 10497,
  })
  for (const magFilter of [9728, 9729] as const)
    for (const minFilter of [9728, 9729, 9984, 9985, 9986, 9987] as const)
      for (const wrapS of [10497, 33071, 33648] as const)
        for (const wrapT of [10497, 33071, 33648] as const) {
          const source = { name: 'Filtro', magFilter, minFilter, wrapS, wrapT }
          expect(readGltfSamplers([source])[0]).toEqual(source)
        }
  for (const value of [null, -1, 9728.1, '9728', 1234])
    for (const field of ['magFilter', 'minFilter', 'wrapS', 'wrapT'])
      failure(() => readGltfSamplers([{ [field]: value }]))
  failure(() => readGltfSamplers([{ magFilter: 9987 }]))
})

test('texture descriptors own references and retain missing sources for explicit extension handling', () => {
  const input = [{ name: 'Imagem', source: 1, sampler: 0 }, {}],
    before = structuredClone(input)
  const output = readGltfTextures(input, 2, 1)
  expect(output).toEqual([
    { name: 'Imagem', source: 1, sampler: 0 },
    { name: null, source: null, sampler: null },
  ])
  output[0]!.source = 0
  expect(input).toEqual(before)
  for (const row of [
    { source: -1 },
    { source: 2 },
    { source: null },
    { source: '0' },
    { sampler: 1 },
    { sampler: null },
    { sampler: 0.5 },
  ])
    failure(() => readGltfTextures([row], 2, 1))
})

test('image references use exactly one source, require MIME for views and do not decode or fetch URIs', () => {
  const views = readGltfBufferViews([{ buffer: 0, byteLength: 16 }], [16])
  const input = [
    { uri: 'textures/cores%20azuis.png', name: 'Cores' },
    { uri: 'data:image/png;base64,not-decoded-at-this-stage', mimeType: 'image/png' },
    { uri: 'https://example.invalid/never-fetched.png' },
    { bufferView: 0, mimeType: 'image/png' },
    { bufferView: 0, mimeType: 'image/png' },
    { uri: 'image.webp', mimeType: 'image/webp' },
  ]
  const before = structuredClone(input),
    images = readGltfImages(input, views, [])
  expect(images[0]).toEqual({
    name: 'Cores',
    kind: 'uri',
    uri: 'textures/cores%20azuis.png',
    mimeType: null,
  })
  expect(images[3]).toEqual({
    name: null,
    kind: 'bufferView',
    bufferView: 0,
    mimeType: 'image/png',
  })
  expect(images[5]!.mimeType).toBe('image/webp')
  images[0]!.name = 'Mudou'
  expect(input).toEqual(before)
  for (const row of [
    {},
    { uri: 'a.png', bufferView: 0, mimeType: 'image/png' },
    { uri: null },
    { uri: 0 },
    { bufferView: 0 },
    { bufferView: 0, mimeType: null },
    { bufferView: 0, mimeType: 1 },
    { bufferView: 1, mimeType: 'image/png' },
    { bufferView: null, mimeType: 'image/png' },
  ])
    failure(() => readGltfImages([row], views, []))
  for (const patch of [{ target: 34962 }, { target: 34963 }, { byteStride: 4 }]) {
    const view = readGltfBufferViews([{ buffer: 0, byteLength: 16, ...patch }], [16])
    failure(() => readGltfImages([{ bufferView: 0, mimeType: 'image/png' }], view, []))
  }
})

test('image views cannot alias any numeric accessor storage, including sparse indices or values', () => {
  const views = readGltfBufferViews(
    Array.from({ length: 4 }, (_, i) => ({ buffer: 0, byteOffset: i, byteLength: 1 })),
    [4],
  )
  const source = [
    {
      bufferView: 0,
      count: 1,
      type: 'SCALAR',
      componentType: 5121,
      sparse: {
        count: 1,
        indices: { bufferView: 1, componentType: 5121 },
        values: { bufferView: 2 },
      },
    },
  ]
  const before = structuredClone(source)
  const accessors = readGltfAccessors(source, {
    status: 'ready',
    buffers: [new Uint8Array(4)],
    views,
    resourceBytes: 4,
  })
  expect(accessors[0]!.sparseViews).toEqual({ indices: 1, values: 2 })
  for (const bufferView of [0, 1, 2])
    failure(() => readGltfImages([{ bufferView, mimeType: 'image/png' }], views, accessors))
  expect(readGltfImages([{ bufferView: 3, mimeType: 'image/png' }], views, accessors)[0]).toEqual({
    name: null,
    kind: 'bufferView',
    bufferView: 3,
    mimeType: 'image/png',
  })
  accessors[0]!.sparseViews!.indices = 3
  expect(source).toEqual(before)
})

test('every core material UV requirement must exist, including zero-strength or later-omitted channels', () => {
  const materials = readGltfMaterials(
    [
      {
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0, texCoord: 0 },
          metallicRoughnessTexture: { index: 0, texCoord: 1 },
        },
        normalTexture: { index: 0, texCoord: 2, scale: 0 },
        occlusionTexture: { index: 0, texCoord: 3, strength: 0 },
        emissiveTexture: { index: 0, texCoord: 4 },
      },
    ],
    1,
  )
  const complete = mesh(0, [0, 1, 2, 3, 4])
  expect(() =>
    validateGltfMaterialUvs([complete, complete, mesh(null, [])], materials),
  ).not.toThrow()
  for (let missing = 0; missing < 5; missing++)
    failure(() =>
      validateGltfMaterialUvs(
        [
          mesh(
            0,
            [0, 1, 2, 3, 4].filter((set) => set !== missing),
          ),
        ],
        materials,
      ),
    )
  failure(() => validateGltfMaterialUvs([mesh(1, [])], materials))
})

test('appearance metadata budgets precede per-item parsing and no arrays are silently truncated', () => {
  const tooMany = Array.from({ length: GLTF_INPUT_LIMITS.appearanceItems + 1 }, () => ({}))
  failure(() => readGltfImages(tooMany, [], []), 'budget')
  failure(() => readGltfMaterials(tooMany, 0), 'budget')
  failure(() => readGltfSamplers(tooMany), 'budget')
  failure(() => readGltfTextures(tooMany, 0, 0), 'budget')
  failure(
    () => readGltfImages([{ uri: 'x'.repeat(GLTF_INPUT_LIMITS.fileBytes + 1) }], [], []),
    'budget',
  )
  failure(
    () => readGltfMaterials([{ name: 'x'.repeat(GLTF_INPUT_LIMITS.pathLength + 1) }], 0),
    'budget',
  )
})

test('untextured PBR and alpha semantics match real GLTFLoader materials without changing linear color values', async () => {
  const materials = [
    {},
    {
      pbrMetallicRoughness: {
        baseColorFactor: [0.125, 0.25, 0.5, 0.25],
        metallicFactor: 0.125,
        roughnessFactor: 0.625,
      },
      emissiveFactor: [0.125, 0.25, 0.5],
      doubleSided: true,
      alphaMode: 'BLEND',
    },
    {
      pbrMetallicRoughness: { baseColorFactor: [0.5, 0.5, 0.5, 0.125] },
      alphaMode: 'MASK',
      alphaCutoff: 0.375,
    },
    { pbrMetallicRoughness: { baseColorFactor: [0.5, 0.5, 0.5, 0.125] }, alphaMode: 'OPAQUE' },
  ]
  const result = readGltfMaterials(materials, 0)
  const loaded = await new GLTFLoader().parseAsync(
    JSON.stringify({ asset: { version: '2.0' }, materials }),
    '',
  )
  for (let i = 0; i < result.length; i++) {
    const actual: MeshStandardMaterial = await loaded.parser.getDependency('material', i),
      expected = result[i]!
    try {
      expect(actual).toBeInstanceOf(MeshStandardMaterial)
      expect(actual.color.toArray()).toEqual(expected.baseColorFactor.slice(0, 3))
      expect(actual.metalness).toBe(expected.metallicFactor)
      expect(actual.roughness).toBe(expected.roughnessFactor)
      expect(actual.emissive.toArray()).toEqual(expected.emissiveFactor)
      expect(actual.transparent).toBe(expected.alphaMode === 'BLEND')
      expect(actual.alphaTest).toBe(expected.alphaMode === 'MASK' ? expected.alphaCutoff : 0)
      expect(actual.side === DoubleSide).toBe(expected.doubleSided)
    } finally {
      actual.dispose()
    }
  }
})

test('image metadata budgets precede accessor-role reads, and no images require no accessor scan', () => {
  const accessors = readGltfAccessors([{ componentType: 5121, type: 'SCALAR', count: 1 }], {
    status: 'ready',
    buffers: [],
    views: [],
    resourceBytes: 0,
  })
  Object.defineProperty(accessors[0], 'layout', {
    get() {
      throw new Error('Numeric role scan is unnecessary')
    },
  })
  failure(
    () =>
      readGltfImages(
        Array.from({ length: GLTF_INPUT_LIMITS.appearanceItems + 1 }, () => ({})),
        [],
        accessors,
      ),
    'budget',
  )
  expect(readGltfImages(undefined, [], accessors)).toEqual([])
  expect(readGltfImages([{ uri: 'color.png' }], [], accessors)).toHaveLength(1)
})

test('real textured GLB preserves every PBR/sampler/image reference through the import readers', () => {
  const document = makeSceneGlbFixture(2, 2, 3, 2),
    before = structuredClone(document)
  const envelope = readGltfEnvelope(encodeSceneGlb(document, { allowLosses: true }).bytes),
    buffers = readGltfBuffers(envelope)
  if (buffers.status !== 'ready') throw new Error('Self-contained fixture expected')
  const accessors = readGltfAccessors(envelope.json.accessors, buffers),
    result = readGltfAppearance(envelope.json, buffers.views, accessors)
  const meshes = readGltfMeshes(envelope.json.meshes, accessors, result.materials.length).meshes
  expect(() => validateGltfMaterialUvs(meshes, result.materials)).not.toThrow()
  const originalMaterials = envelope.json.materials as Array<{
    pbrMetallicRoughness: {
      baseColorFactor: number[]
      baseColorTexture?: { index: number }
      metallicFactor: number
      roughnessFactor: number
    }
    alphaMode?: string
  }>
  for (const [i, material] of result.materials.entries()) {
    const source = originalMaterials[i]!
    expect(Array.from(material.baseColorFactor)).toEqual(
      source.pbrMetallicRoughness.baseColorFactor,
    )
    expect(material.baseColorTexture?.index).toBe(
      source.pbrMetallicRoughness.baseColorTexture?.index,
    )
    expect(material.metallicFactor).toBe(source.pbrMetallicRoughness.metallicFactor)
    expect(material.roughnessFactor).toBe(source.pbrMetallicRoughness.roughnessFactor)
    expect(source.alphaMode ?? 'OPAQUE').toBe(material.alphaMode)
  }
  expect(result.images).toHaveLength((envelope.json.images as unknown[]).length)
  expect(
    result.samplers.every((sampler) => sampler.magFilter === 9728 && sampler.minFilter === 9728),
  ).toBe(true)
  expect(
    result.images.every((image) => image.kind === 'bufferView' && image.mimeType === 'image/png'),
  ).toBe(true)
  expect(document).toEqual(before)
})
