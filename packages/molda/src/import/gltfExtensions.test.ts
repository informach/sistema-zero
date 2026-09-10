import { expect, test } from 'bun:test'
import { readGltfExtensions } from './gltfExtensions'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'

test('extension declarations stay explicit, unique, owned and consistent before required support gates', () => {
  const input = { extensionsUsed: ['VENDOR_feature'] },
    result = readGltfExtensions(input)
  expect(result).toEqual({ unhandled: ['VENDOR_feature'], occurrences: [] })
  result.unhandled[0] = 'changed'
  expect(input.extensionsUsed).toEqual(['VENDOR_feature'])
  expect(readGltfExtensions({})).toEqual({ unhandled: [], occurrences: [] })
  for (const field of ['extensionsUsed', 'extensionsRequired'])
    for (const value of [null, [], {}, [1], [null], new Array(1), ['VENDOR_a', 'VENDOR_a']])
      expect(() => readGltfExtensions({ [field]: value })).toThrow(GltfInputError)
  for (const value of [
    { extensionsRequired: ['VENDOR_a'] },
    { extensionsUsed: ['VENDOR_b'], extensionsRequired: ['VENDOR_a'] },
  ]) {
    try {
      readGltfExtensions(value)
      throw new Error('Expected invalid')
    } catch (error) {
      if (!(error instanceof GltfInputError)) throw error
      expect(error.reason).toBe('invalid')
    }
  }
  const required = {
    extensionsUsed: ['KHR_materials_unlit'],
    extensionsRequired: ['KHR_materials_unlit'],
    get meshes() {
      throw new Error('Required support check must precede data')
    },
  }
  try {
    readGltfExtensions(required)
    throw new Error('Expected unsupported')
  } catch (error) {
    if (!(error instanceof GltfInputError)) throw error
    expect(error.reason).toBe('unsupported')
  }
})

test('only schema extension points are inventoried; extras and payload contents remain inert', () => {
  const entry = {
    extensions: { VENDOR_feature: { extras: { extensions: { ignore_me: 1 } } } },
    extras: { extensions: { also_ignore: 2 } },
  }
  const input = {
    extensionsUsed: ['VENDOR_feature'],
    ...entry,
    asset: entry,
    buffers: [entry],
    bufferViews: [entry],
    nodes: [entry],
    scenes: [entry],
    skins: [entry],
    textures: [entry],
    samplers: [entry],
    images: [entry],
    accessors: [{ ...entry, sparse: { ...entry, indices: entry, values: entry } }],
    meshes: [{ ...entry, primitives: [entry] }],
    materials: [
      {
        ...entry,
        pbrMetallicRoughness: {
          ...entry,
          baseColorTexture: entry,
          metallicRoughnessTexture: entry,
        },
        normalTexture: entry,
        occlusionTexture: entry,
        emissiveTexture: entry,
      },
    ],
    cameras: [{ ...entry, perspective: entry }],
    animations: [{ ...entry, samplers: [entry], channels: [{ ...entry, target: entry }] }],
  }
  const before = structuredClone(input),
    result = readGltfExtensions(input)
  const expected = [
    'glTF',
    'asset',
    'buffers[0]',
    'bufferViews[0]',
    'nodes[0]',
    'scenes[0]',
    'skins[0]',
    'textures[0]',
    'samplers[0]',
    'images[0]',
    'accessors[0]',
    'accessors[0].sparse',
    'accessors[0].sparse.indices',
    'accessors[0].sparse.values',
    'meshes[0]',
    'meshes[0].primitives[0]',
    'materials[0]',
    'materials[0].pbrMetallicRoughness',
    'materials[0].pbrMetallicRoughness.baseColorTexture',
    'materials[0].pbrMetallicRoughness.metallicRoughnessTexture',
    'materials[0].normalTexture',
    'materials[0].occlusionTexture',
    'materials[0].emissiveTexture',
    'cameras[0]',
    'cameras[0].perspective',
    'animations[0]',
    'animations[0].samplers[0]',
    'animations[0].channels[0]',
    'animations[0].channels[0].target',
  ]
  expect(result.occurrences).toEqual(
    expected.map((path) => ({ name: 'VENDOR_feature', path: `${path}.extensions.VENDOR_feature` })),
  )
  expect(input).toEqual(before)
  expect(() => readGltfExtensions({ nodes: [entry] })).toThrow(GltfInputError)
  for (const value of [null, [], 1, 'text'])
    expect(() =>
      readGltfExtensions({
        extensionsUsed: ['VENDOR_feature'],
        nodes: [{ extensions: { VENDOR_feature: value } }],
      }),
    ).toThrow(GltfInputError)
})

test('declarations and extension uses have independent exact budgets', () => {
  expect(
    readGltfExtensions({ extensionsUsed: Array.from({ length: 1024 }, (_, i) => `VENDOR_${i}`) })
      .unhandled,
  ).toHaveLength(1024)
  expect(() => readGltfExtensions({ extensionsUsed: new Array(1025) })).toThrow(GltfInputError)
  const source = {
    extensionsUsed: ['VENDOR_a'],
    nodes: Array(GLTF_INPUT_LIMITS.extensionUses).fill({ extensions: { VENDOR_a: {} } }),
  }
  expect(readGltfExtensions(source).occurrences).toHaveLength(GLTF_INPUT_LIMITS.extensionUses)
  try {
    readGltfExtensions({ ...source, extensions: { VENDOR_a: {} } })
    throw new Error('Expected budget')
  } catch (error) {
    if (!(error instanceof GltfInputError)) throw error
    expect(error.reason).toBe('budget')
  }
})
