import { expect, test } from 'bun:test'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import type { SceneMeshGeometry } from './document'
import { indexSceneDocument } from './documentIndex'
import { affineMultiply, identityMatrix } from './matrix'
import { readSceneDocument } from './readDocument'
import { SCENE_SKIN_LIMITS } from './skin'
import { bindSceneSkin, readSceneSkinBindings } from './skinBinding'

test('bind captures full affine rest without decomposing, owns nested data, and the reader never recomputes bind pose', () => {
  const { document, input } = makeSceneSkinFixture(),
    before = structuredClone({ document, input }),
    binding = bindSceneSkin(document, input),
    index = indexSceneDocument(document)
  expect(readSceneDocument(document).status).toBe('valid')
  expect({ document, input }).toEqual(before)
  for (const joint of binding.joints) {
    const recovered = affineMultiply(
        index.scene.worldMatrices.get(joint.nodeId)!,
        joint.inverseBindMatrix,
      ),
      world = index.scene.worldMatrices.get(binding.nodeId)!
    for (let i = 0; i < 16; i++) expect(recovered[i]!).toBeCloseTo(world[i]!, 12)
  }
  const read = readSceneSkinBindings(JSON.parse(JSON.stringify([binding])), document)
  expect(read).toEqual([binding])
  expect(read[0]!.weights.v_0_0 === binding.weights.v_0_0).toBe(false)
  document.nodes[2] = {
    ...document.nodes[2]!,
    transform: { kind: 'affine', matrix: identityMatrix() },
  }
  expect(readSceneSkinBindings([binding], document)).toEqual([binding])
  expect(bindSceneSkin(document, input)).not.toEqual(binding)
  const almost = structuredClone(binding)
  almost.weights.v_1_0![0]!.weight += 1e-10
  expect(readSceneSkinBindings([almost], document)).toEqual([almost])
})

test('binding reader rejects unknown fields, orphaned/duplicate references, missing vertices and non-normalized weights', () => {
  const { document, input } = makeSceneSkinFixture(),
    binding = bindSceneSkin(document, input),
    mutations: Array<(value: Record<string, unknown>) => void> = [
      (value) => {
        value.extra = true
      },
      (value) => {
        value.nodeId = 'absent'
      },
      (value) => {
        value.nodeId = 'rig'
      },
      (value) => {
        value.joints = []
      },
      (value) => {
        value.joints = [binding.joints[0], binding.joints[0]]
      },
      (value) => {
        value.joints = [{ ...binding.joints[0], nodeId: 'absent' }]
      },
      (value) => {
        value.joints = [{ ...binding.joints[0], nodeId: 'part-0' }]
      },
      (value) => {
        value.joints = [{ ...binding.joints[0], extra: 1 }]
      },
      (value) => {
        value.joints = [{ ...binding.joints[0], inverseBindMatrix: Array(16).fill(0) }]
      },
      (value) => {
        value.weights = {}
      },
      (value) => {
        value.weights = { ...binding.weights, absent: binding.weights.v_0_0 }
      },
      (value) => {
        value.weights = { ...binding.weights, v_0_0: [{ jointId: 'rig', weight: 1 }] }
      },
      (value) => {
        value.weights = { ...binding.weights, v_0_0: [{ jointId: 'upper', weight: 2 }] }
      },
      (value) => {
        value.weights = { ...binding.weights, v_0_0: [{ jointId: 'upper', weight: 0.999 }] }
      },
      (value) => {
        value.weights = { ...binding.weights, v_0_0: [{ jointId: 'upper', weight: '1' }] }
      },
    ]
  for (const mutate of mutations) {
    const value = structuredClone(binding) as unknown as Record<string, unknown>
    mutate(value)
    expect(() => readSceneSkinBindings([value], document)).toThrow()
  }
  expect(() => readSceneSkinBindings([binding, { ...binding, id: 'other' }], document)).toThrow(
    'já tem',
  )
  expect(() =>
    readSceneSkinBindings(Array(SCENE_SKIN_LIMITS.bindings + 1).fill(binding), document),
  ).toThrow('orçamento')
  const singular = structuredClone(document)
  singular.nodes[2]!.transform = {
    kind: 'trs',
    translation: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    scale: [0, 1, 1],
  }
  expect(() => bindSceneSkin(singular, input)).toThrow('segurança')
  expect(() => bindSceneSkin(document, { ...input, extra: true } as never)).toThrow('desconhecido')
  const empty = structuredClone(document)
  const geometry = empty.geometries[0] as SceneMeshGeometry
  geometry.vertices = {}
  geometry.faces = {}
  expect(() => bindSceneSkin(empty, { ...input, weights: {} })).toThrow('ponto')
  document.nodes.push({ ...document.nodes[0]!, id: 'second' })
  expect(() =>
    readSceneSkinBindings([binding, { ...binding, nodeId: 'second' }], document),
  ).toThrow('repetido')
})

test('weighted-vertex budget counts each bound instance even when all nodes share one small geometry', () => {
  const { document, input } = makeSceneSkinFixture(),
    geometry = document.geometries[0] as SceneMeshGeometry,
    mesh = document.nodes[0]!
  geometry.faces = {}
  geometry.vertices = Object.fromEntries(
    Array.from({ length: 1024 }, (_, i) => [`v${i}`, [0, 0, 0]]),
  )
  document.nodes = [
    ...document.nodes.slice(1),
    ...Array.from({ length: 128 }, (_, i) => ({ ...mesh, id: `mesh-${i}` })),
  ]
  input.nodeId = 'mesh-0'
  input.weights = Object.fromEntries(
    Object.keys(geometry.vertices).map((id) => [id, [{ jointId: 'upper', weight: 1 }]]),
  )
  const first = bindSceneSkin(document, input),
    bindings = Array.from({ length: 128 }, (_, i) => ({
      ...first,
      id: `skin-${i}`,
      nodeId: `mesh-${i}`,
    }))
  expect(readSceneSkinBindings(bindings, document)).toHaveLength(128)
  geometry.vertices.extra = [0, 0, 0]
  first.weights.extra = [{ jointId: 'upper', weight: 1 }]
  expect(() => readSceneSkinBindings(bindings, document)).toThrow('orçamento')
})

test('prototype-like vertex and joint ids remain own data, never inherited setters or missing lookup fallbacks', () => {
  const { document, input } = makeSceneSkinFixture(),
    geometry = document.geometries[0] as SceneMeshGeometry
  geometry.vertices = Object.fromEntries([['__proto__', [0, 0, 0]]])
  geometry.faces = {}
  document.nodes[3] = { ...document.nodes[3]!, id: 'constructor' }
  input.jointIds = ['constructor']
  input.weights = Object.fromEntries([['__proto__', [{ jointId: 'constructor', weight: 1 }]]])
  const binding = bindSceneSkin(document, input)
  expect(Object.hasOwn(binding.weights, '__proto__')).toBe(true)
  expect(Object.getPrototypeOf(binding.weights)).toBe(Object.prototype)
  expect(binding.weights.__proto__).toEqual([{ jointId: 'constructor', weight: 1 }])
})
